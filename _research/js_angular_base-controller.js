var app = angular.module('app');

app.controller('baseCtrl', [
    '$scope',
    '$rootScope',
    'baseHttp',
    'localStorageService',
    '$state',
    '$mdSidenav',
    '$mdMenu',
    '$mdDialog',
    '$window',
    '$sce',
    '$mdToast',
    '$timeout',
    '$filter',
    baseCtrl,
]);

function baseCtrl(
    $scope,
    $rootScope,
    baseHttp,
    localStorageService,
    $state,
    $mdSidenav,
    $mdMenu,
    $mdDialog,
    $window,
    $sce,
    $mdToast,
    $timeout,
    $filter
) {
    $scope.toggleLeft = buildToggler('left');
    $scope.toggleRight = buildToggler('right');
    $scope.showModal = false;
    $scope.isAdminOrMaster = false;
    $scope.modalAnimate = null;
    $scope.notDoneTask = null;
    //для работы с модальным окном Задачника
    //массив цветовдля индикатора над прогресс-баром
    $scope.indicatorBackground = ['rgba(89,200,0,1)', 'rgba(255,230,1,1)', 'rgba(255,117,1,1)', 'rgba(255,5,1,1)'];
    //отступ индикатора ДЗ
    $scope.dzIndicatorMargin = 0;
    //отступ индикатора отзывов
    $scope.reviewIndicatorMargin = 0;
    //отступ индикатора потерь
    $scope.losselIndicatorMargin = 0;
    //цвет индикатора ДЗ
    $scope.dzIndicatorBackground = 'rgba(89,200,0,1)';
    //цвет индикатора отзывов
    $scope.reviewIndicatorBackground = 'rgba(89,200,0,1)';
    //цвет индикатора потерь
    $scope.lossesIndicatorBackground = 'rgba(89,200,0,1)';

    $scope.myDateNew = new Date();
    $scope.minDate = new Date($scope.myDateNew.getFullYear(), $scope.myDateNew.getMonth(), $scope.myDateNew.getDate());
    /**
     * закрытие бокового меню
     */
    $scope.closeSidebar = () => {
        $mdSidenav('left').close();
    };
    /**
     * открытие бокового меню
     */
    $scope.openSidebar = () => {
        //поместил в макрозадачу, чтобы открытие выполнилось после ивента на ссылке
        setTimeout(() => {
            $mdSidenav('left').open();
        }, 50);
    };
    $scope.isOpenLeft = () => {
        return $mdSidenav('left').isOpen();
    };
    function buildToggler(componentId) {
        return function () {
            $mdSidenav(componentId).toggle();
        };
    }

    $scope.getTeach = function () {
        baseHttp.getTeachList().success(function (r) {
            $scope.teach_list = r;
        });
    };

    $scope.changeUser = function (id) {
        $rootScope.clearLocalStorage();
        baseHttp
            .changeTeach({ id_user: id })
            .success(function () {
                location.reload();
            })
            .error(function (r) {
                $mdToast.show({
                    hideDelay: 4000,
                    position: 'top right',
                    template: '<md-toast class="md-toast red">' + r.message + '</md-toast>',
                });
            });
    };

    $scope.changeCity = function (id) {
        location.replace('/auth/change-city?city=' + id);
    };

    $scope.changeLang = function (id) {
        baseHttp.changeLang({ id: id }).success(function () {
            location.reload();
        });
    };

    $scope.getBaseConfig = function () {
        baseHttp.getBaseConfig().success(function (r) {
            $rootScope.langList = r.languages;
            $scope.langListFiltered = r.languages.filter(function (item) {
                // исключаем испанский, польский и казахский языки из списка в меню
                return item['short_name'] !== 'es' && item['short_name'] !== 'pl' && item['short_name'] !== 'kz';
            });
            $scope.current_lang = r.current_lang;
            $rootScope.dateFormat = r.dateFormat;
            $rootScope.dateFormatShort = r.dateFormatShort;
            $rootScope.timezoneUTC = 'UTC';
            $rootScope.timezoneF = '';
            $rootScope.signalExist = r.signalExist;
            $rootScope.env = r.env;
            $rootScope.upload_url = r.upload_url;
        });
    };

    $scope.showPrerenderedDialog = function (ev) {
        $mdDialog.show({
            controller: DialogController,
            contentElement: '#signalModal',
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose: true,
        });
    };

    /**
     * Модальное окно с заданиями для преподавателя
     * @param ev
     */
    $scope.showTeachingNotifications = function (ev) {
        $mdDialog.show({
            controller: DialogController,
            contentElement: '#teachingNotificationsModal',
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

    $scope.checkIsAdminOrMaster = function (list) {
        if (list.length === 0) {
            $scope.isAdminOrMaster = false;
        }

        for (var i = 0; i < list.length; i++) {
            if (list[i] === '0' || list[i] === '1') {
                $scope.isAdminOrMaster = true;
            } else {
                $scope.isAdminOrMaster = false;
            }
        }
    };

    $rootScope.getCountUnreadNews = function () {
        baseHttp.getCountUnreadNews().success(function (r) {
            $rootScope.count_unread_news = r;
        });
    };

    $rootScope.getCountNewHw = function () {
        baseHttp.getCountNewHw().success(function (r) {
            $rootScope.count_new_hw = r.hm;
            $rootScope.count_new_lw = r.lw;
        });
    };

    /*
     * Запрос на количество студентов попадающи в потенциальные потери
     */
    $rootScope.getCountTrafficStud = function () {
        baseHttp.getCountTrafficStud().success(function (r) {
            $rootScope.count_tr_stud = r.success.length;
        });
    };

    $rootScope.getCountPortfolio = function () {
        baseHttp.getCountPortfolio().success(function (r) {
            $rootScope.count_portfolio_request = r;
        });
    };

    $rootScope.getNewExamsCount = function () {
        baseHttp.getNewExamsCount().success(function (r) {
            $rootScope.count_new_exams = r;
        });
    };

    $scope.isDesign = function () {
        baseHttp.isDesign().success(function (r) {
            $rootScope.is_design = r;
            if (r) {
                $rootScope.getCountPortfolio();
            }
        });
    };

    $rootScope.clearLocalStorage = function () {
        localStorageService.clearAll();
    };

    $scope.setActiveNow = function (id) {
        //помещаю в макрозадачу, чтобы выполнялась после ивентов на родителе

        if ($scope.isOpenLeft()) {
            setTimeout(() => {
                $scope.closeSidebar();
            });
        } else $scope.closeSidebar();
        $scope.activeNav = id;
        $rootScope.clearLocalStorage();
        localStorageService.set('activeNav', id);
    };

    $scope.setActiveNowBinding = function (id) {
        $scope.activeNav = id;
        $rootScope.clearLocalStorage();
        localStorageService.set('activeNav', id);
    };

    //include #dashboard here
    $scope.activeNav = localStorageService.get('activeNav') ? localStorageService.get('activeNav') : '';

    $rootScope.getFileExtensions = function (filename) {
        filename = filename || '';

        return filename.split('.').pop().toLowerCase();
    };

    $rootScope.canUseInFrame = function (filename) {
        var file_ext = $rootScope.getFileExtensions(filename);
        var ext_frame_file = ['pdf'];

        return ext_frame_file.indexOf(file_ext) >= 0;
    };

    $rootScope.isImageHttp = function (filename) {
        if (!filename) {
            return false;
        }
        var xhr = new XMLHttpRequest();
        xhr.open('HEAD', filename, false);
        xhr.send(null);

        return xhr.getResponseHeader('Content-type').indexOf('image') !== -1;
    };

    $rootScope.canUseInFrameHttp = function (filename) {
        if (!filename) {
            return false;
        }
        var xhr = new XMLHttpRequest();
        xhr.open('HEAD', filename, false);
        xhr.send(null);

        return xhr.getResponseHeader('Content-type').indexOf('pdf') !== -1;
    };

    $rootScope.isImage = function (filename) {
        var file_ext = $rootScope.getFileExtensions(filename);
        var ext_frame_file = ['png', 'jpg'];

        return ext_frame_file.indexOf(file_ext) >= 0;
    };

    $rootScope.redirect = function (url) {
        $state.go(url);
        $scope.bindActive = url;
    };

    $rootScope.clearCache = function () {
        baseHttp.clearCache().success(function (r) {
            if (r.success) {
                $mdToast.show({
                    hideDelay: 4000,
                    position: 'top right',
                    template: '<md-toast class="md-toast green">' + r.success + '</md-toast>',
                });
            } else {
                $mdToast.show({
                    hideDelay: 4000,
                    position: 'top right',
                    template: '<md-toast class="md-toast red">' + r.error + '</md-toast>',
                });
            }
        });
    };

    $rootScope.getApprovedRequest = function () {
        baseHttp.getApprovedRequest().success(function (r) {
            if (r.count_request > 0) {
                $rootScope.countRequestPresents = r.count_request;
            } else {
                $rootScope.countRequestPresents = 0;
            }
        });
    };

    $rootScope.getCountPairs = function () {
        baseHttp.getCountPairs().success(function (r) {
            $rootScope.count_pairs = parseInt(r.count_pairs);
        });
    };

    $rootScope.copyObj = function (source, destination) {
        if (!angular.equals(source, destination)) {
            if (!!destination) {
                angular.copy(source, destination);
            } else {
                destination = angular.copy(source);
            }
        }

        return destination;
    };

    $rootScope.getById = function getById(field, id, myArray) {
        if (angular.isDefined(myArray)) {
            return myArray.filter(function (obj) {
                if (obj[field] == id) {
                    return obj;
                }
            })[0];
        }
    };

    $rootScope.getKeyByValue = function getById(field, id, myArray) {
        var result = 0;
        angular.forEach(myArray, function (value, key) {
            if (value[field] == id) {
                result = key;
                return false;
            }
        });

        return result;
    };

    var myWidth = window.innerWidth;

    if (myWidth < 1000) {
        $scope.hideAll = 1;
    }

    /**
     * Запрос на получения данных по невыполненным заданиям
     */
    $scope.notDoneTaskInfo = function () {
        baseHttp.getNotDoneTask().success(function (r) {
            $scope.notDoneTask = r;
            $scope.setDzProgressBar(r.dzStud.progress_bar);
            $scope.setReviewProgressBar(r.reviewsStud.progress_bar);
            $scope.setLossesProgressBar(r.potentialLosses);
        });
    };

    $scope.getNews = function () {
        baseHttp.getNews().success(function (r) {
            $scope.news_list = r;
            $scope.active_news = $scope.news_list[0];
        });
    };

    $scope.readNews = function (id) {
        baseHttp.readNews({ id: id }, { headers: { 'show-loader': false } }).success(function (r) {
            if (r) {
                $rootScope.getCountUnreadNews();
            }
        });
    };

    $scope.activeNews = -1;
    $scope.activeNewsNum = -1;

    $scope.setActiveNews = function (news) {
        $scope.readNews(news.id_bbs);
        $scope.active_news = news;
        $scope.activeNewsNum = news.id_bbs;
        if (window.innerWidth < 992) {
            $scope.myStyle = { fontSize: '30' };
        }
    };

    $scope.renderHtml = function (html_code, img) {
        if (img) {
            html_code = html_code.replace(/<img[^>]*>/g, '');
        }
        return $sce.trustAsHtml(html_code);
    };

    $scope.getDataMenu = function () {
        baseHttp.getDataMenu().success(function (r) {
            $scope.branch = r.branch;

            $scope.news_list = r.news;
            $scope.active_news = $scope.news_list[0]; //

            baseHttp.getCountTrafficStud().success(function (r) {
                $rootScope.count_tr_stud = r.success.length;
            });

            baseHttp.getAvgEvaluationLessonMark().success(function (r) {
                $rootScope.avg_evaluation_lesson_mark = r;
            });

            $rootScope.langList = r.languages;
            $scope.langListFiltered = r.languages.filter(function (item) {
                // исключаем испанский, польский и казахский языки из списка в меню
                return item['short_name'] !== 'es' && item['short_name'] !== 'pl' && item['short_name'] !== 'kz';
            });
            $scope.current_lang = r.current_lang;
            $rootScope.dateFormat = r.dateFormat;
            $rootScope.dateFormatShort = r.dateFormatShort;
            $rootScope.timezoneUTC = 'UTC';
            $rootScope.timezoneF = '';
            $rootScope.signalExist = r.signalExist;
            $rootScope.env = r.env;
            $rootScope.upload_url = r.upload_url;

            $rootScope.is_design = r.isDesign; //
            $rootScope.getCountPortfolio(); //

            $rootScope.count_new_hw = r.homeworks.hm; //
            $rootScope.count_new_lw = r.homeworks.lw; //

            $rootScope.count_new_exams = r.exams; //

            $rootScope.count_pairs = parseInt(r.count_pairs); //

            $rootScope.count_unread_news = r.unreadNews;
        });
    };

    /**
     * Расчет уровня Z-index в html
     * Суть чтобы в прогресс баре мы смогли отображать видимым 3 полосы . Чем меньше значение тем выше расположение полосы.
     * И наоборот чем выше тем значение Z-index меньше
     *
     * @param current - текущее значение
     * @param dataValues -  значение всех
     *
     * @return int
     */
    $scope.priorityIndexViews = function (current, dataValues) {
        if (dataValues === undefined) {
            return 0;
        }
        var result = 0;
        if (dataValues.savedPerc !== undefined && current <= dataValues.savedPerc) {
            result++;
        }
        if (dataValues.notSavedPerc !== undefined && current <= dataValues.notSavedPerc) {
            result++;
        }
        if (dataValues.inWorkPerc !== undefined && current <= dataValues.inWorkPerc) {
            result++;
        }

        return result;
    };

    /**
     * устанавливает цвет и отступ индикатора на прогресс-баре для домашних заданий
     * @param dzBar
     */
    $scope.setDzProgressBar = function (dzBar) {
        //выбор цвета для индикатора
        $scope.dzIndicatorBackground = $scope.indicatorBackground[dzBar.valueWeight - 1];
        let maxValue = 6;
        let marginValue = 0;
        if (dzBar.factDays > 0 && dzBar.factDays < maxValue) {
            marginValue = (dzBar.factDays / maxValue) * 100;
        }
        if (dzBar.factDays >= maxValue) {
            marginValue = 100;
        }
        $scope.dzIndicatorMargin = `0 0 7px calc(${marginValue}% - 20px);`; // 20px - половина блока индикатора
    };

    /**
     * устанавливает цвет и отступ индикатора на прогресс-баре для отзывов
     * @param reviewBar
     */
    $scope.setReviewProgressBar = function (reviewBar) {
        $scope.reviewIndicatorBackground = $scope.indicatorBackground[reviewBar.valueWeight - 1];
        let maxValue = 100;
        let marginValue = 0;
        if (reviewBar.factPercent > 0 && reviewBar.factPercent < maxValue) {
            marginValue = reviewBar.factPercent;
        }
        if (reviewBar.factPercent >= maxValue) {
            marginValue = 100;
        }
        $scope.reviewIndicatorMargin = `0 0 7px calc(${marginValue}% - 20px);`;
    };
    /**
     * устанавливает цвет и отступ индикатора на прогресс-баре для потенциальных потер
     * @param losses
     */
    $scope.setLossesProgressBar = function (losses) {
        $scope.lossesIndicatorBackground = $scope.indicatorBackground[losses.progress_bar_result.valueWeight - 1];
        // инвертируем проценты, т.к. 100% у нас слева
        $scope.losselIndicatorMargin = `0 0 7px calc(${100 - losses.workedPercent}% - 20px);`;
    };

    /**
     * Проверяет тип бизнес-проекта филиала
     *
     * @param {string} projectType
     *
     * @returns {boolean}
     */
    $scope.isBusinessProject = (projectType) => {
        return $scope.branch?.['business_project'] === projectType;
    };

    /**
     * Филиал является школой.
     *
     * @returns {boolean}
     */
    $scope.isSchool = () => $scope.isBusinessProject(BusinessProject.SCHOOL);

    /**
     * Задержка перед автозакрытием формы после успешной отправки, мс.
     */
    const LEAD_FORM_CLOSE_DELAY_MS = 1500;

    const LEAD_EMAIL_REGEX = /^[a-zA-Z0-9._-]+@[a-z0-9_-]+\.([a-z]+\.)?[a-z]{2,}/;

    /**
     * Сбрасывает состояние формы отправки лида в исходное.
     *
     * @returns {void}
     */
    const resetLeadForm = () => {
        $scope.leadFormSubmitting = false;
        $scope.leadFormError = '';
        $scope.leadFormSuccess = false;
        $scope.leadEmailInvalid = false;
        $scope.leadEmailTouched = false;
        $scope.leadForm = {
            formOfEducationId: null,
            name: '',
            phone: '',
            email: '',
        };
    };

    /**
     * Проверяет формат email при вводе.
     *
     * @returns {void}
     */
    $scope.onLeadEmailChange = () => {
        $scope.leadEmailTouched = true;
        $scope.leadEmailInvalid = $scope.leadForm.email !== '' && !LEAD_EMAIL_REGEX.test($scope.leadForm.email);
    };

    $scope.leadFormVisible = false;
    $scope.leadFormStudyForms = [];
    resetLeadForm();

    baseHttp.getPublicForms().success((response) => {
        $scope.leadFormStudyForms = response.map((form) => ({
            ...form,
            name_form: form.name_form === 'ITлагерь' ? 'ITканикулы' : form.name_form,
        }));
    });

    /**
     * Определения символов для ui-mask поля телефона.
     */
    $scope.leadMaskDefinitions = UI_MASK_DEFINITIONS;

    /**
     * Маска телефона для текущего филиала. '?' — без ограничений (значение по умолчанию,
     * пока маска не загружена).
     *
     * @type {string}
     */
    $scope.leadPhoneMask = '?';

    /**
     * Приводит маску из mask_mobline к формату ui-mask:
     * '~' → 'L', российский код → стандартная маска, '?LLL' (более двух L) → '?L?L?L…'.
     *
     * @param {string} rawMask
     *
     * @returns {string}
     */
    const normalizeLeadPhoneMask = (rawMask) => {
        if (!rawMask) {
            return '?';
        }

        const phoneCode = rawMask.replace(/[L?+~-]/gi, '').replace(/ /g, '');
        if (phoneCode === '7') {
            return '+R LLL LLL-LL-LL';
        }

        return rawMask
            .replace(/~/gi, 'L')
            .trim()
            .replace(/(\?)(L+)/g, (match, questionMark, letters) =>
                letters.length > 2 ? letters.replace(/L/g, '?L') : match
            );
    };

    /**
     * Загружает локализованную маску телефона: облачные филиалы получают расширенную
     * маску, остальные — маску из mask_mobline (с подменой на стандартную для РФ).
     *
     * @returns {void}
     */
    const loadLeadPhoneMask = () => {
        if (BRANCH_EXTEND_PHONE_MASK.includes(Number(currentBranchId))) {
            $scope.leadPhoneMask = CLOUD_MASK;

            return;
        }

        baseHttp.getPhoneCode().success((response) => {
            $scope.leadPhoneMask = normalizeLeadPhoneMask(response.phoneCode);
        });
    };

    loadLeadPhoneMask();

    /**
     * Открывает форму отправки лида.
     *
     * @returns {void}
     */
    $scope.openLeadForm = () => {
        resetLeadForm();
        $scope.leadFormVisible = true;
    };

    /**
     * Закрывает форму отправки лида.
     *
     * @returns {void}
     */
    $scope.closeLeadForm = () => {
        $scope.leadFormVisible = false;
        resetLeadForm();
    };

    /**
     * Отправляет лид в CRM через Roistat.
     *
     * @returns {void}
     */
    $scope.submitLead = () => {
        if ($scope.leadFormSubmitting) {
            return;
        }
        $scope.leadFormSubmitting = true;
        $scope.leadFormError = '';

        const getCookie = (name) => {
            const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
            return match ? decodeURIComponent(match[1]) : '';
        };

        const data = {
            name: $scope.leadForm.name,
            phone: $scope.leadForm.phone,
            email: $scope.leadForm.email,
            form_of_education_id: $scope.leadForm.formOfEducationId,
            roistat_visit: getCookie('roistat_visit') || 'nocookie',
        };

        baseHttp.sendLead(data).success(() => {
            $scope.leadFormSubmitting = false;
            $scope.leadFormSuccess = true;
            $timeout(() => $scope.closeLeadForm(), LEAD_FORM_CLOSE_DELAY_MS);
        }).error(() => {
            $scope.leadFormSubmitting = false;
            $scope.leadFormError = $filter('translate')('LEAD_FORM__ERROR');
        });
    };

    $scope.getDataMenu();
    $scope.notDoneTaskInfo();
}
