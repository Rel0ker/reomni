app.controller('bindCreateMaterialsCtrl', [
    '$scope',
    '$mdDialog',
    '$filter',
    'baseHttp',
    '$mdToast',
    'EditorService',
    'EditorParserService',
    '$sce',
    '$timeout',
    'DIRECTORY_TYPE',
    'bindHttp',
    'content',
    'canEdit',
    'materialTitle',
    'publicSpecId',
    'historyKey',
    function (
        $scope,
        $mdDialog,
        $filter,
        baseHttp,
        $mdToast,
        EditorService,
        EditorParserService,
        $sce,
        $timeout,
        DIRECTORY_TYPE,
        bindHttp,
        content,
        canEdit,
        materialTitle,
        publicSpecId,
        historyKey
    ) {
        $scope.editorHistoryState = { canUndo: false, canRedo: false };
        const initialEditorContent = content && content.length ? JSON.parse(content) : null;

        /**
         * Экземпляр редактора.
         * @type {EditorJS}
         */
        $scope.editor = EditorService.initEditor('editorjs', uploadFile, {
            enabled: Boolean(canEdit),
            storageKey: canEdit ? historyKey : null,
            maxEntries: 30,
            captureDelay: 450,
            initialData: initialEditorContent,
        });
        const unsubscribeHistory = $scope.editor.history?.subscribe((state) => {
            $scope.editorHistoryState = state;
            $scope.$applyAsync();
        });

        /**
         * Parser редактора.
         * @type {Object}
         */
        $scope.edjsParser = EditorParserService.initEditorParser();

        /**
         * Есть права на редактирование.
         * @type {boolean}
         */
        $scope.canEdit = canEdit;
        $scope.materialTitle = materialTitle;

        $scope.content = '';
        $scope.isPreviewMode = !canEdit;
        $scope.isImporting = false;
        $scope.isImportPanelOpen = false;
        $scope.importState = createImportState();

        $scope.openImportPanel = function () {
            $scope.importState = createImportState();
            $scope.isImportPanelOpen = true;
            focusImportInput();
        };

        $scope.closeImportPanel = function (forceClose) {
            if ($scope.isImporting && !forceClose) {
                return;
            }

            $scope.isImportPanelOpen = false;
            $scope.importState = createImportState();
        };

        $scope.resetImportValidation = function () {
            $scope.importState.hasError = false;
            $scope.importState.needsReplaceConfirmation = false;
        };

        $scope.submitImportMaterialContent = async function () {
            const url = ($scope.importState.url || '').trim();
            if (!url) {
                $scope.importState.hasError = true;
                focusImportInput();

                return;
            }

            await $scope.editor.isReady;

            if (!$scope.importState.needsReplaceConfirmation) {
                const currentContent = await $scope.editor.save();
                const hasContent = (currentContent.blocks || []).some((block) => {
                    return block.type !== 'paragraph' || (block.data.text || '').trim() !== '';
                });

                if (hasContent) {
                    $scope.importState.needsReplaceConfirmation = true;
                    $scope.$applyAsync();

                    return;
                }
            }

            $scope.isImporting = true;
            $scope.importState.hasError = false;

            try {
                const response = await bindHttp.importMaterialContent({
                    url: url,
                    public_spec_id: publicSpecId,
                });
                if ($scope.editor.history) {
                    await $scope.editor.history.renderExternal(response.data.content);
                } else {
                    await $scope.editor.render(response.data.content);
                }
                $scope.closeImportPanel(true);

                if (response.data.unsupportedWidgets && response.data.unsupportedWidgets.length > 0) {
                    $mdToast.show({
                        hideDelay: 6000,
                        position: 'top right',
                        template:
                            '<md-toast class="md-toast red">' +
                            $filter('translate')('EDITOR__IMPORT_UNSUPPORTED') +
                            ': ' +
                            response.data.unsupportedWidgets.join(', ') +
                            '</md-toast>',
                    });
                }
            } catch (error) {
                $scope.importState.hasError = true;
            } finally {
                $scope.isImporting = false;
                $scope.$applyAsync();
            }
        };

        function createImportState() {
            return {
                url: '',
                hasError: false,
                needsReplaceConfirmation: false,
            };
        }

        function focusImportInput() {
            $timeout(() => {
                const input = document.getElementById('material-import-url');
                if (input) {
                    input.focus();
                }
            });
        }

        $scope.undoEditor = function () {
            $scope.editor.history?.undo();
        };

        $scope.redoEditor = function () {
            $scope.editor.history?.redo();
        };

        $scope.closeModal = function (needSave) {
            if (needSave && $scope.canEdit) {
                $scope.editor
                    .save()
                    .then((outputData) => {
                        $scope.editor.history?.recordSnapshot(outputData);
                        if (outputData.blocks && outputData.blocks.length > 0) {
                            $mdDialog.hide(JSON.stringify(outputData));
                        } else {
                            $mdDialog.hide(null);
                        }
                    })
                    .catch((error) => {
                        $mdToast.show({
                            hideDelay: 4000,
                            position: 'top right',
                            template:
                                '<md-toast class="md-toast red">' +
                                $filter('translate')('save_error') +
                                ': ' +
                                error +
                                '</md-toast>',
                        });
                    });
            } else {
                $scope.editor.history?.clear();
                $mdDialog.hide(content);
            }
        };

        $scope.previewContent = function () {
            $scope.editor.save().then((outputData) => {
                const parseResult = EditorParserService.parseAndCombineBlocks($scope.edjsParser, outputData);

                $scope.content = $sce.trustAsHtml(parseResult);
                $scope.isPreviewMode = true;

                $timeout(() => {
                    const modalElement = document.querySelector('#editor-modal');
                    if (modalElement) {
                        modalElement.scrollTop = 0;
                    }

                    EditorService.updateEvents();
                }, 100);
            });
        };

        $scope.showEditor = function () {
            $scope.isPreviewMode = !canEdit;

            $timeout(() => {
                const modalElement = document.querySelector('#editor-modal');
                if (modalElement) {
                    modalElement.scrollTop = modalElement.scrollHeight;
                }
            }, 0);
        };

        function uploadFile(file) {
            return new Promise((resolve, reject) => {
                baseHttp.getFileUploadToken().success(function (credentials) {
                    if (angular.isDefined(credentials.token)) {
                        baseHttp
                            .uploadFile(credentials, file, DIRECTORY_TYPE.MATERIAL)
                            .success(function (rU) {
                                if (angular.isDefined(rU[0].link)) {
                                    resolve({
                                        success: 1,
                                        file: {
                                            url: rU[0].link,
                                        },
                                    });
                                } else {
                                    reject($filter('translate')('file_upload_server_error_lb_hw'));
                                    $mdToast.show({
                                        hideDelay: 4000,
                                        position: 'top right',
                                        template:
                                            '<md-toast class="md-toast red">' +
                                            $filter('translate')('file_upload_server_error_lb_hw') +
                                            '</md-toast>',
                                    });
                                }
                            })
                            .error(function (eR) {
                                reject($filter('translate')('file_upload_server_error_lb_hw'));
                                $mdToast.show({
                                    hideDelay: 4000,
                                    position: 'top right',
                                    template:
                                        '<md-toast class="md-toast red">' +
                                        $filter('translate')('file_upload_server_error_lb_hw') +
                                        '</md-toast>',
                                });
                            });
                    }
                });
            });
        }

        /**
         * Инициализация контроллера.
         * @returns {void}
         */
        $scope.init = () => {
            $scope.editor.isReady.then(async () => {
                if ($scope.editor.history) {
                    await $scope.editor.history.ready;
                } else if (initialEditorContent) {
                    await $scope.editor.render(initialEditorContent);
                }

                if (!$scope.canEdit) {
                    $scope.isPreviewMode = !$scope.canEdit;

                    $timeout(() => {
                        $scope.previewContent();
                    }, 100);
                }
            });
        };

        /** Запускается инициализация.*/
        $scope.init();

        $scope.$on('$destroy', () => {
            unsubscribeHistory?.();
            $scope.editor.history?.destroy();
        });
    },
]);
