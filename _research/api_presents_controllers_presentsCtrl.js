var app_module = angular.module('app');

app_module.controller('presentsCtrl', [
    '$scope',
    'presentsHttp',
    '$rootScope',
    '$timeout',
    'localStorageService',
    '$filter',
    '$mdToast',
    '$mdDialog',
    'WAS_TRUE',
    'WAS_FALSE',
    '$http',
    presentsCtrl,
]);

function presentsCtrl(
    $scope,
    presentsHttp,
    $rootScope,
    $timeout,
    localStorageService,
    $filter,
    $mdToast,
    $mdDialog,
    WAS_TRUE,
    WAS_FALSE,
    $http
) {
    $rootScope.getApprovedRequest();
    $scope.cur_group = localStorageService.get('cur_group_pr');
    $scope.cur_lenta = localStorageService.get('cur_lenta_pr');
    $scope.cur_date = localStorageService.get('cur_date_pr');
    $scope.cur_spec = localStorageService.get('cur_spec_pr');

    $scope.can_set_th = false;

    // Объект, для сохранения данных о начисленных кристаллах студентам, перед отправкой на сервер
    $scope.prizeStud = {};

    // Объект, для сохранения данных о посещении студентами пары, перед отправкой на сервер
    $scope.wasStud = {};

    // Объект, для сохранения данных об оценках студентов, перед отправкой на сервер
    $scope.markStud = {};

    $rootScope.wasUsers = [];
    // #KAN-1504 remove this item
    // $scope.userWasSave = true;
    $scope.userState = '';
    $scope.not_student = false;
    $scope.states = (
        'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS ' +
        'MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI ' +
        'WY'
    )
        .split(' ')
        .map(function (state) {
            return { abbrev: state };
        });
    $scope.total = { diamondsCount: 0 };

    // Тип оценки - за контрольную работу.
    $scope.TYPE_MARK_TEST_WORK = 2;
    // Тип оценки - за классную работу.
    $scope.TYPE_MARK_CLASSWORK = 4;

    // Для отображения popup об успешном удалении алмазов
    $scope.REMOVE_REWARD = 4;

    $scope.vizit_info = {
        setting_theme: '',
    };
    $scope.methodpackageThemes = [];
    $scope.methodpackageThemesByKey = {};
    $scope.selectedMethodpackageTheme = null;
    $scope.themeSelection = 'manual';
    $scope.methodpackageIssueOptions = {
        homework: false,
        labwork: false,
    };

    /**
     * Загрузка расписания со студентами.
     *
     * @param data - данные.
     * @param headers - заголовки для запроса на получение студентов расписания.
     */
    $scope.getPresents = function (data, headers) {
        data.date = $scope.cur_date;
        presentsHttp
            .getPresents(data, headers)
            .success(function (r) {
                $scope.th_presents_colums = [
                    { th: $filter('translate')('fio_stud') },
                    { th: $filter('translate')('vizit_mystat') },
                    { th: '' },
                    { th: $filter('translate')('control_work') },
                    { th: $filter('translate')('work_in_lessons') },
                    { th: ' ' },
                    { th: $filter('translate')('comment') },
                ];
                if (r) {
                    $scope.result = r;
                    $scope.cur_lenta = r.cur_lenta || r.cur_lenta == '0' ? r.cur_lenta : 0;
                    $scope.groups = r.groups;
                    $scope.students = r.students;

                    if (!angular.isUndefined(r.students)) {
                        $scope.vizit_info = $scope.students[0] || { setting_theme: '' };
                    }

                    $scope.not_student = r.empty_group === true;
                    angular.forEach(r.students, function (value, key) {
                        if (value.id_vizit > 0) {
                            $scope.vizit_info = value;
                        }
                    });

                    if (angular.isDefined($scope.vizit_info)) {
                        $scope.vizit_info.setting_theme = $scope.vizit_info.theme;
                    } else {
                        $scope.not_student = true;
                    }
                    $scope.recoverableTheme = !$scope.vizit_info.theme && r.recoverable_theme
                        ? r.recoverable_theme : null;
                    if ($scope.recoverableTheme) {
                        $scope.vizit_info.setting_theme = $scope.recoverableTheme.theme;
                        $scope.vizit_info.primary_teach = $scope.recoverableTheme.primary_teach;
                        $scope.vizit_info.public_week_id = $scope.recoverableTheme.public_week_id;
                    }
                    $scope.cur_date = r.cur_date;
                    $scope.cur_group = r.cur_group;
                    $scope.schedule = r.schedule;
                    $scope.cur_spec = r.cur_spec;
                    $scope.prev_lenta = r.prev_lenta;
                    $scope.cur_schedule = r.cur_schedule;
                    $scope.methodpackageThemes = [];
                    $scope.methodpackageThemesByKey = {};
                    $scope.selectedMethodpackageTheme = null;
                    $scope.themeSelection = 'manual';
                    $scope.resetMethodpackageIssueOptions();
                    if ($scope.cur_schedule && r.scheduleType === 'planned') {
                        presentsHttp.getMethodpackageThemes({ schedule: $scope.cur_schedule }).success(function (themes) {
                            $scope.methodpackageThemes = themes.map(function (theme) {
                                theme.key = theme.package_id + ':' + theme.week;
                                $scope.methodpackageThemesByKey[theme.key] = theme;

                                return theme;
                            });

                            if ($scope.check_theme === 1) {
                                $scope.restoreMethodpackageThemeSelection();
                            }
                        });
                    }
                    $scope.groupCount = !angular.isUndefined($scope.groups) ? Object.keys($scope.groups).length : 0;
                    $scope.homework = r.homework;
                    $scope.labwork = r.labwork;
                    $scope.materials = r.materials;
                    $scope.date_hw_overdue = r.date_hw_overdue;
                    $scope.next_lenta = !angular.isUndefined(r.next_lenta) ? r.next_lenta : r.cur_lenta;
                    $scope.total.diamondsCount = r.totalPoints;
                    $scope.today = r.today;
                    $scope.cur_lenta_number = r.cur_lenta_number;
                    // $scope.cur_date_tr = r.cur_date_tr;
                    $scope.cur_date_tr = r.cur_date_tr.split(', ')[1] + ', ' + r.cur_date_tr.split(', ')[0];
                    $scope.stop_lenta = r.stop_lenta;
                    $scope.end_lenta_time = r.end_lenta_time;
                    $scope.can_set_theme = r.can_set_theme;
                    var theme = angular.isDefined($scope.vizit_info) ? $scope.vizit_info.theme : '';
                    localStorageService.set('cur_group_pr', $scope.cur_group);
                    localStorageService.set('cur_lenta_pr', $scope.cur_lenta);
                    localStorageService.set('cur_date_pr', $scope.cur_date);
                    localStorageService.set('homework_pr', $scope.homework);
                    localStorageService.set('labwork_pr', $scope.labwork);
                    localStorageService.set('labwork_pr', $scope.materials);
                    localStorageService.set('cur_spec_pr', $scope.cur_spec);
                    localStorageService.set('theme', theme);
                }
            })
            .error(function (error) {
                $mdToast.show({
                    hideDelay: 3000,
                    position: 'top right',
                    template: '<md-toast class="md-toast red">' + error.message + '</md-toast>',
                });
            });
        $scope.check_theme = 0;
    };

    $scope.showPrerenderedDialog = function (ev) {
        $mdDialog.show({
            controller: DialogController,
            contentElement: '#myDialog',
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose: true,
        });
    };

    $scope.hidemyDialog = function () {
        $mdDialog.hide();
    };

    function DialogController($scope, $mdDialog) {
        $scope.hide = function () {
            $mdDialog.hide();
        };

        $scope.cancel = function () {
            $mdDialog.cancel();
        };

        $scope.answer = function (answer) {
            $mdDialog.hide(answer);
        };
    }

    $scope.click_lenta = function (index) {
        angular.element('li.active').removeClass('active');
        $scope.getPresents({ lenta: index }, null);
    };

    $scope.setTeachType = function (type) {
        if (!$scope.vizit_info) {
            $scope.vizit_info = {};
        }

        $scope.startThemeEditing();
        $scope.vizit_info.primary_teach = type;
    };

    $scope.startThemeEditing = function () {
        $scope.check_theme = 1;
        $scope.vizit_info.old_theme = $scope.vizit_info.theme;
        $scope.restoreMethodpackageThemeSelection();
    };

    $scope.restoreMethodpackageThemeSelection = function () {
        const savedTheme = $scope.vizit_info.theme || $scope.vizit_info.setting_theme;
        const selectedTheme = $scope.methodpackageThemes.find(function (theme) {
            return theme.public_week_id === Number($scope.vizit_info.public_week_id);
        }) || $scope.methodpackageThemes.find(function (theme) {
            return !$scope.vizit_info.public_week_id && theme.theme === savedTheme;
        });

        if (!selectedTheme) {
            $scope.themeSelection = 'manual';
            $scope.selectedMethodpackageTheme = null;
            $scope.resetMethodpackageIssueOptions();
            return;
        }

        $scope.selectMethodpackageTheme(selectedTheme);
    };

    $scope.getSelectedMethodpackageTheme = function () {
        if ($scope.themeSelection === 'manual') {
            return null;
        }

        if (angular.isObject($scope.themeSelection)) {
            return $scope.themeSelection;
        }

        if ($scope.selectedMethodpackageTheme
            && $scope.selectedMethodpackageTheme.key === $scope.themeSelection) {
            return $scope.selectedMethodpackageTheme;
        }

        return $scope.methodpackageThemesByKey[$scope.themeSelection] || null;
    };

    $scope.isMethodpackageThemeSelected = function () {
        return $scope.getSelectedMethodpackageTheme() !== null;
    };

    $scope.isPlannedLesson = function () {
        return $scope.result && $scope.result.scheduleType === 'planned';
    };

    $scope.resetMethodpackageIssueOptions = function () {
        $scope.methodpackageIssueOptions.homework = false;
        $scope.methodpackageIssueOptions.labwork = false;
    };

    $scope.onThemeSelectionChange = function () {
        const theme = $scope.getSelectedMethodpackageTheme();
        if (!theme) {
            $scope.selectedMethodpackageTheme = null;
            $scope.resetMethodpackageIssueOptions();
            return;
        }

        $scope.selectedMethodpackageTheme = theme;
        $scope.vizit_info.setting_theme = theme.theme;
        const isSavedTheme = theme.public_week_id === Number($scope.vizit_info.public_week_id);
        $scope.methodpackageIssueOptions.homework = !!theme.has_homework
            && (!isSavedTheme || !!($scope.homework && $scope.homework.public_material_id));
        $scope.methodpackageIssueOptions.labwork = !!theme.has_labwork
            && (!isSavedTheme || !!($scope.labwork && $scope.labwork.public_material_id));
    };

    $scope.selectMethodpackageTheme = function (theme) {
        $scope.selectedMethodpackageTheme = theme;
        $scope.themeSelection = theme.key;
        $scope.onThemeSelectionChange();
    };

    $scope.selectManualTheme = function () {
        $scope.themeSelection = 'manual';
        $scope.selectedMethodpackageTheme = null;
        $scope.resetMethodpackageIssueOptions();
    };

    $scope.hasSelectedTopicHomework = function () {
        const theme = $scope.getSelectedMethodpackageTheme();

        return !!(theme && theme.has_homework);
    };

    $scope.hasSelectedTopicLabwork = function () {
        const theme = $scope.getSelectedMethodpackageTheme();

        return !!(theme && theme.has_labwork);
    };

    $scope.getThemeSaveData = function () {
        const selectedTheme = $scope.themeSelection === 'manual'
            ? null
            : $scope.getSelectedMethodpackageTheme();

        if (!selectedTheme) {
            $scope.selectedMethodpackageTheme = null;
            $scope.resetMethodpackageIssueOptions();
        }

        return {
            theme: $scope.getThemeValue(),
            selectedTheme,
            publicWeekId: selectedTheme ? selectedTheme.public_week_id : null,
            issueHomework: !!(selectedTheme && $scope.methodpackageIssueOptions.homework),
            issueLabwork: !!(selectedTheme && $scope.methodpackageIssueOptions.labwork),
            issuedHomework: !!($scope.homework && $scope.homework.public_material_id),
            issuedLabwork: !!($scope.labwork && $scope.labwork.public_material_id),
        };
    };

    $scope.setTheme = function () {
        const themeSaveData = $scope.getThemeSaveData();
        const hasMethodpackageMaterialsChanges = themeSaveData.selectedTheme
            && (themeSaveData.issueHomework !== themeSaveData.issuedHomework
                || themeSaveData.issueLabwork !== themeSaveData.issuedLabwork);
        if (hasMethodpackageMaterialsChanges) {
            const confirm = $mdDialog.confirm()
                .title($filter('translate')('confirm_methodpackage_materials_title'))
                .textContent($filter('translate')('confirm_methodpackage_materials_text'))
                .ok($filter('translate')('ok'))
                .cancel($filter('translate')('cancel'));

            $mdDialog.show(confirm).then(function () {
                $scope.saveTheme(themeSaveData);
            });

            return;
        }

        $scope.saveTheme(themeSaveData);
    };

    $scope.saveTheme = function (themeSaveData) {
        if (!$scope.vizit_info) {
            $scope.vizit_info = {};
        }

        themeSaveData = themeSaveData || $scope.getThemeSaveData();
        const theme = themeSaveData.theme;

        presentsHttp
            .setTheme({
                date: $scope.cur_date,
                lenta: $scope.cur_lenta,
                group: $scope.cur_group,
                theme,
                spec: $scope.cur_spec?.id_spec,
                source: $scope.cur_spec?.source,
                id_base_spec: $scope.cur_spec?.id_base_spec,
                public_week_id: themeSaveData.publicWeekId,
                issue_homework: themeSaveData.issueHomework,
                issue_labwork: themeSaveData.issueLabwork,
                schedule: $scope.cur_schedule,
                scheduleType: $scope.result.scheduleType,
                teach_type: $scope.vizit_info.primary_teach ? $scope.vizit_info.primary_teach : 0,
                numberParticipants: $scope.result.scheduleData?.number_participants
                    ? $scope.result.scheduleData.number_participants
                    : null,
            })
            .success(function (r) {
                if (r.success || r.theme_saved) {
                    $scope.check_theme = 0;
                    $scope.vizit_info.setting_theme = theme;
                    $scope.vizit_info.theme = theme;
                    localStorageService.set('theme', $scope.vizit_info.theme);
                    if (angular.isDefined(r.visits_id)) {
                        $scope.students = $scope.students.map(function (val) {
                            angular.forEach(r.visits_id, function (valueResponse, keyResponse) {
                                if (valueResponse.id_stud == val.id_stud) {
                                    val['id_vizit'] = valueResponse.id_vizit;
                                }
                            });

                            return val;
                        });
                    }
                    $scope.getPresents({ lenta: $scope.cur_lenta, group: $scope.cur_group }, null);
                }

                const className = r.success ? 'green' : 'red';

                $mdToast.show({
                    hideDelay: 3000,
                    position: 'top right',
                    template: `<md-toast class="md-toast ${className}">${r.message}</md-toast>`,
                });
            })
            .error(function (error, status) {
                if (status === 422) {
                    $scope.refreshGroupStudents();
                }
                $mdToast.show({
                    hideDelay: 3000,
                    position: 'top right',
                    template: '<md-toast class="md-toast red">' + error.message + '</md-toast>',
                });
                $scope.vizit_info.primary_teach = null;
            });
    };

    $scope.getThemeValue = function () {
        if ($scope.result.scheduleType === 'event') {
            return $scope.result.scheduleData.theme;
        }

        return $scope.isMethodpackageThemeSelected()
            ? $scope.getSelectedMethodpackageTheme().theme
            : $scope.vizit_info.setting_theme;
    };

    $scope.refreshGroupStudents = function () {
        $scope.getPresents({ lenta: $scope.cur_lenta, group: $scope.cur_group }, null);
    };

    $scope.click_group = function (group) {
        $scope.getPresents({ lenta: $scope.cur_lenta, group: group }, null);
    };

    $scope.setWas = function (was, vizit, id_stud, id_schedule, primary_teach, theme, obj_key) {
        var data = new Date();
        var keyWas = '' + data.getSeconds() + data.getMilliseconds(); //создаем уникальный ключ массива посещаемости
        $scope.wasStud[keyWas] = {
            was: was,
            vizit: vizit,
            id_stud: id_stud,
            id_schedule: id_schedule,
            primary_teach: primary_teach,
            theme: theme,
        };
        // #KAN-1504 remove this item
        // $rootScope.isLoading = true;
        $scope.addExitEvent();
        $scope.students[obj_key].was = was;
    };

    /**
     *
     * @type {number}
     * Отмечаем студентов каждые несколько секунд
     */
    var setWasByTime = setInterval(function () {
        var dataWas = { ...$scope.wasStud };
        if (
            angular.isDefined(dataWas) &&
            dataWas !== null &&
            Object.keys(dataWas).length > 0 &&
            $scope.startWas !== true
        ) {
            $scope.setWasSingle({ visits: dataWas, schedule: $scope.cur_schedule });
        }
    }, 1000);

    $scope.setWasSingle = function (data) {
        $scope.startWas = true;
        presentsHttp
            .setWas(data)
            .success(function (r) {
                if (r.error) {
                    $mdToast.show({
                        hideDelay: 4000,
                        position: 'top right',
                        template: '<md-toast class="md-toast red">' + r.error + '</md-toast>',
                    });

                    return;
                }
                $scope.startWas = false;
                $scope.removeExitEvent();

                $mdToast.show({
                    hideDelay: 3000,
                    position: 'top right',
                    template:
                        '<md-toast class="md-toast green">' +
                        $filter('translate')('save_attendance_student_success') +
                        '</md-toast>',
                });

                var dataWas = $scope.wasStud;
                angular.forEach(data.visits, function (value, key) {
                    delete dataWas[key];
                });
                if (r.new_id_vizit) {
                    $scope.students = $scope.students.map(function (val) {
                        if (r.new_id_vizit[val['id_stud']]) {
                            val['id_vizit'] = r.new_id_vizit[val['id_stud']].id_vizit;
                        }
                        return val;
                    });
                    return $scope.cur_was;
                }
            })
            .error(function (error, status) {
                if (status === 422) {
                    $scope.startWas = false;
                    $scope.wasStud = {};
                    $scope.removeExitEvent();
                    $scope.refreshGroupStudents();
                }
                $mdToast.show({
                    hideDelay: 3000,
                    position: 'top right',
                    template: '<md-toast class="md-toast red">' + error.message + '</md-toast>',
                });
            });
    };

    $scope.setWasAll = function () {
        $scope.ShowVizit = false;
        presentsHttp
            .setWasAll({
                lenta: $scope.cur_lenta,
                group: $scope.cur_group,
                date: $scope.cur_date,
                schedule: $scope.cur_schedule,
            })
            .success(function (r) {
                if (r) {
                    if (r.error) {
                        $mdToast.show({
                            hideDelay: 4000,
                            position: 'top right',
                            template: '<md-toast class="md-toast red">' + r.error + '</md-toast>',
                        });

                        return;
                    }
                    $scope.students = $scope.students.map(function (val) {
                        val['was'] = val['id_vizit'] ? WAS_TRUE : val['was'];
                        return val;
                    });
                    // #KAN-1504 add this item
                    $mdToast.show({
                        hideDelay: 3000,
                        position: 'top right',
                        template:
                            '<md-toast class="md-toast green">' +
                            $filter('translate')('save_attendance_students_success') +
                            '</md-toast>',
                    });
                }
            })
            .error(function (error) {
                $mdToast.show({
                    hideDelay: 3000,
                    position: 'top right',
                    template: '<md-toast class="md-toast red">' + error.message + '</md-toast>',
                });
            });
    };

    /**
     * Проставка оценки (собирается в $scope.markStud)
     *
     * @param type - Тип оценки.
     * @param mark - Оценка.
     * @param vizit - id посещения.
     * @param obj_key - Ключ объекта массива студентов.
     */
    $scope.setMark = function (type, mark, vizit, obj_key) {
        var data = new Date();
        var keyMark = '' + data.getSeconds() + data.getMilliseconds(); //создаем уникальный ключ массива оценок
        $scope.markStud[keyMark] = {
            type: type,
            mark: mark,
            vizit: vizit,
        };

        $scope.addExitEvent();

        if (type === $scope.TYPE_MARK_TEST_WORK) {
            $scope.students[obj_key].mark2 = mark;
        } else if (type === $scope.TYPE_MARK_CLASSWORK) {
            $scope.students[obj_key].mark4 = mark;
        }
    };

    /**
     * Проставляем оценки студентам каждые несколько секунд
     *
     * @type {number}
     */
    var setMarkByTime = setInterval(function () {
        var dataMark = { ...$scope.markStud };
        var canSetMark =
            angular.isDefined(dataMark) &&
            dataMark !== null &&
            Object.keys(dataMark).length > 0 &&
            $scope.startMark !== true &&
            $scope.startWas !== true;
        if (canSetMark) {
            $scope.setMarkSend({ marks: dataMark });
        }
    }, 1000);

    /**
     * Отправка данных с оценками.
     *
     * @param data[] - Данные с оценками.
     */
    $scope.setMarkSend = function (data) {
        $scope.startMark = true;
        presentsHttp
            .setMark(data)
            .success(function (r) {
                $scope.startMark = false;
                $scope.removeExitEvent();

                var dataMark = $scope.markStud;
                angular.forEach(data.marks, function (value, key) {
                    delete dataMark[key];
                });

                const className = r.success ? 'green' : 'red';

                $mdToast.show({
                    hideDelay: 3000,
                    position: 'top right',
                    template: `<md-toast class="md-toast ${className}">${r.message}</md-toast>`,
                });
            })
            .error(function (error) {
                $mdToast.show({
                    hideDelay: 3000,
                    position: 'top right',
                    template: '<md-toast class="md-toast red">' + error.message + '</md-toast>',
                });
            });
    };

    /**
     * Проставка награды (алмазов) (собирается в $scope.prizeStud)
     *
     * @param stud - объект данных студа.
     * @param obj_key - Ключ объекта массива студентов.
     */
    $scope.setPrize = function (stud, obj_key) {
        var data = new Date();
        var keyPrize = '' + data.getSeconds() + data.getMilliseconds(); //создаем уникальный ключ массива наград
        $scope.prizeStud[keyPrize] = {
            id: stud.id_vizit,
            reward: stud.prize,
        };

        $scope.addExitEvent();

        $scope.students[obj_key].prize = stud.prize;
    };

    /**
     * Проставляем награды студентам каждые несколько секунд
     *
     * @type {number}
     */
    var setPrizeByTime = setInterval(function () {
        var dataPrize = { ...$scope.prizeStud };
        var canSetPrize =
            angular.isDefined(dataPrize) &&
            dataPrize !== null &&
            Object.keys(dataPrize).length > 0 &&
            $scope.startPrize !== true &&
            $scope.setWas &&
            $scope.startWas !== true;
        if (canSetPrize) {
            $scope.setPrizeSend({ prizes: dataPrize });
        }
    }, 1000);

    /**
     * Отправка данных с наградами.
     *
     * @param data[] - Данные с наградами.
     */
    $scope.setPrizeSend = function (data) {
        $scope.startPrize = true;
        presentsHttp
            .setPrize(data)
            .success(function (r) {
                $scope.startPrize = false;
                $scope.removeExitEvent();

                var dataPrize = $scope.prizeStud;
                angular.forEach(data.prizes, function (value, key) {
                    delete dataPrize[key];
                });

                if (r.error) {
                    $scope.getPresents(
                        {
                            lenta: $scope.cur_lenta,
                            group: $scope.cur_group,
                            date: $scope.cur_date,
                        },
                        { 'show-loader': '' }
                    );

                    $mdToast.show({
                        hideDelay: 4000,
                        position: 'top right',
                        template: '<md-toast class="md-toast red">' + r.error + '</md-toast>',
                    });
                } else if (r.success) {
                    $scope.total.diamondsCount = r.total;
                    let cur_reward; // кол-во алмазов
                    for (let key in data.prizes) {
                        if (data.prizes[key].reward) {
                            cur_reward = +data.prizes[key].reward;
                        }
                    }

                    $mdToast.show({
                        hideDelay: 3000,
                        position: 'top right',
                        template: `<md-toast class="md-toast green">${cur_reward === $scope.REMOVE_REWARD ? $filter('translate')('remove_reward_success') : $filter('translate')('add_reward_success')}</md-toast>`,
                    });
                }
            })
            .error(function (error) {
                $mdToast.show({
                    hideDelay: 3000,
                    position: 'top right',
                    template: '<md-toast class="md-toast red">' + error.message + '</md-toast>',
                });
            });
    };

    $scope.copyFromPrev = function () {
        presentsHttp
            .copyFromPrev({
                lenta: $scope.cur_lenta,
                group: $scope.cur_group,
                spec: $scope.cur_spec.id_spec,
                source: $scope.cur_spec.source,
                id_base_spec: $scope.cur_spec.id_base_spec,
                date: $scope.cur_date,
                schedule: $scope.cur_schedule,
                only_attendance: $scope.result.scheduleType === 'planned',
            })
            .success(function (r) {
                if (!r.success) {
                    $mdToast.show({
                        hideDelay: 3000,
                        position: 'top right',
                        template: '<md-toast class="md-toast red">' + r.message + '</md-toast>',
                    });

                    return null;
                }

                $scope.getPresents(
                    {
                        lenta: $scope.cur_lenta,
                        group: $scope.cur_group,
                        date: $scope.cur_date,
                    },
                    { 'show-loader': '' }
                );
                if ($scope.result.scheduleType === 'planned') {
                    $scope.startThemeEditing();
                }
            })
            .error(function (error) {
                $mdToast.show({
                    hideDelay: 3000,
                    position: 'top right',
                    template: '<md-toast class="md-toast red">' + error.message + '</md-toast>',
                });
            });
    };

    $scope.getDataRequest = function () {
        presentsHttp
            .GetDataRequestZavuch()
            .success(function (r) {
                $scope.date_select = r.dates;
                $scope.request_history = r.requests;
                $scope.request = {};
                r.requests.forEach(function (i) {
                    if (i.can_set == 1) {
                        $scope.can_set_th = true;
                    }
                });
            })
            .error(function (error) {
                $mdToast.show({
                    hideDelay: 3000,
                    position: 'top right',
                    template: '<md-toast class="md-toast red">' + error.message + '</md-toast>',
                });
            });
    };

    $scope.massages = {};

    $scope.sendRequest = function () {
        presentsHttp
            .sendRequest($scope.request)
            .success(function (r) {
                $scope.resultRequest = r;
                if (r.success) {
                    $scope.messages = r.success;
                    $mdToast.show({
                        hideDelay: 3000,
                        position: 'top right',
                        template: '<md-toast class="md-toast green">' + $scope.messages + '</md-toast>',
                    });
                    $mdDialog.hide();
                } else if (r.error) {
                    $scope.messages = r.error;
                    $mdToast.show({
                        hideDelay: 3000,
                        position: 'top right',
                        template: '<md-toast class="md-toast red">' + $scope.messages + '</md-toast>',
                    });
                }
            })
            .error(function (error) {
                $mdToast.show({
                    hideDelay: 3000,
                    position: 'top right',
                    template: '<md-toast class="md-toast red">' + error.message + '</md-toast>',
                });
            });
    };

    $scope.switchDate = function (date) {
        $scope.cur_date = date;
        $scope.getPresents({}, null);
        $mdDialog.hide();
    };

    $scope.setComment = function (id, id_stud, comment) {
        presentsHttp
            .setComment({ id: id, id_stud: id_stud, comment: comment, lesson: $scope.cur_lenta, date: $scope.cur_date })
            .success(function (r) {
                if (r.success) {
                    $scope.messages = r.success;
                    $mdToast.show({
                        hideDelay: 3000,
                        position: 'top right',
                        template: '<md-toast class="md-toast green">' + $scope.messages + '</md-toast>',
                    });
                    $scope.getPresents({ lenta: $scope.cur_lenta, group: $scope.cur_group }, null);
                } else if (r.error) {
                    $scope.messages = r.error;
                }
            })
            .error(function (error) {
                $mdToast.show({
                    hideDelay: 3000,
                    position: 'top right',
                    template: '<md-toast class="md-toast red">' + error.message + '</md-toast>',
                });
            });
    };

    $scope.unParseComment = function (string) {
        if (angular.isDefined(string) && string) {
            var sub_str = string.substring(string.indexOf(' ')); //ищем второй пробел в строке и обрезаем строку)
            return sub_str.substring(sub_str.indexOf(':') + 1);
        }
    };

    $scope.getPresents(
        {
            lenta: localStorageService.get('cur_lenta_pr') ? localStorageService.get('cur_lenta_pr') : 0,
            group: $scope.cur_group,
            date: $scope.cur_date,
        },
        null
    );

    $scope.stopPair = function (idSchedule) {
        presentsHttp.stopPair({ idSchedule: idSchedule }).success(function (r) {
            if (r.success) {
                $scope.end_lenta_time = r.date_end;
            } else {
            }
        });
    };

    function exitEvent(e) {
        var confirmationMessage = '\o/';
        e.returnValue = confirmationMessage;
        return confirmationMessage;
    }

    /**
     * Добавляем событие чтобы не закрывали вкладку пока не сохранены присутствующие или оценки
     */
    $scope.addExitEvent = function () {
        // #KAN-1504 remove this item
        // $scope.userWasSave = false;
        window.addEventListener('beforeunload', exitEvent);
    };

    /**
     * Удаляем событие чтобы не закрывали вкладку пока не сохранены присутствующие или оценки
     */
    $scope.removeExitEvent = function () {
        // #KAN-1504 remove this item
        // $scope.userWasSave = true;
        window.removeEventListener('beforeunload', exitEvent);
    };

    /**
     * Изменение количества участников мероприятия
     */
    $scope.changeNumberParticipants = () => {
        let numbers = $scope.result.scheduleData.number_participants.replace(/\D/g, '');

        if ($scope.result.scheduleData.number_participants === undefined || numbers === '') {
            $scope.result.scheduleData.number_participants = 0;
            return;
        }

        $scope.result.scheduleData.number_participants = parseInt(numbers) < 1000 ? parseInt(numbers) : 1000;
    };

    /**
     * Условия отображения блока типа учителя
     * @return {boolean}
     */
    $scope.showTeacherBlock = () => {
        if ($scope.not_student && $scope.result?.scheduleType !== 'event') {
            return false;
        }
        if ($scope.result?.schedule) {
            return Array.isArray($scope.result.schedule)
                ? !!$scope.result.schedule.length > 0
                : !!Object.keys($scope.result.schedule).length > 0;
        }

        return false;
    };
}
