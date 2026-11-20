var appModule = angular.module('app');

appModule.controller('diplomaProjectsController', [
    '$scope',
    'examsHttp',
    '$filter',
    '$rootScope',
    '$mdToast',
    diplomaProjectsController,
]);

app.run(($rootScope, baseHttp) =>
    baseHttp.getArrayMarks().success((response) => ($rootScope.arrayMarks = response.reverse()))
);

/**
 * Контроллер для работы с дипломными проектами
 *
 * @param $scope
 * @param examsHttp
 * @param $filter
 * @param $rootScope
 * @param $mdToast
 */
function diplomaProjectsController($scope, examsHttp, $filter, $rootScope, $mdToast) {
    /**
     * Прослушивает изменение массива оценок, полученных с сервера
     */
    $rootScope.$watch('arrayMarks', (newValue, oldValue) => {
        if (newValue !== oldValue && Array.isArray(newValue)) {
            $scope.initGrades();
        }
    });

    /**
     * Инициализация оценок для выпадающих списков
     *
     * @return void
     */
    $scope.initGrades = () => {
        $scope.tempGrades = [];
        $scope.grades = {};

        angular.forEach($rootScope.arrayMarks, (value, key) => {
            $scope.tempGrades[key] = value;
        });

        $scope.grades['-0'] = $filter('translate')('MARK_TYPE_ABSENT');

        angular.forEach($scope.tempGrades, (value) => {
            $scope.grades[value] = String(value);
        });
    };

    /**
     * Получение дипломных проектов
     *
     * @return void
     */
    $scope.getDiplomaProjects = () => {
        examsHttp.getDiplomaProjects().success((response) => ($scope.projectsList = response));
    };

    /**
     * Устанавливает тему дипломного проекта
     *
     * @param theme {string}
     * @param id {number}
     * @return void
     */
    $scope.setTheme = (theme, id) => {
        examsHttp
            .setThemeDiplomaProject({ theme: theme, id: id })
            .success((response) => $scope.showNotification(response.result, response.message));
    };

    /**
     * Устанавливает оценку за дипломный проект
     *
     * @param grade {number}
     * @param id {number}
     * @return {boolean | undefined}
     */
    $scope.setGrade = (grade, id) => {
        if (grade === null) {
            return true;
        }

        examsHttp
            .setGradeDiplomaProject({ grade: grade, id: id })
            .success((response) => $scope.showNotification(response.result, response.message));
    };

    /**
     * Показывает уведомление с результатом
     *
     * @param result {boolean}
     * @param message {string}
     * @return void
     */
    $scope.showNotification = (result, message) => {
        const className = result ? 'green' : 'red';

        $mdToast.show({
            hideDelay: 4000,
            position: 'top right',
            template: `<md-toast class="md-toast ${className}">${message}</md-toast>`,
        });
    };

    $scope.getDiplomaProjects();
    $scope.initGrades();
}
