/**
 * Created by Milkevich on 20.04.2017.
 */
var app = angular.module('app');
app.controller('bindCityCtrl', ['$scope', '$controller', 'bindHttp', '$filter', '$mdDialog', '$mdToast', bindCityCtrl]);

function bindCityCtrl($scope, $controller, bindHttp, $filter, $mdDialog, $mdToast) {
    $scope.current_form = null;
    $scope.current_direction = null;
    $scope.current_spec = null;
    $scope.currentPackageData = null;
    $scope.packageReplacementId = null;
    $scope.availabilityReplacementId = null;
    $scope.packagesDataByDirection = [];
    $scope.connection = {};
    $scope.availability = {};
    $scope.parametersModal = {
        templateUrl: 'views/templates/confirms.html',
        ok: $filter('translate')('ok'),
        cancel: $filter('translate')('cancel'),
    };

    $scope.getPublicForm = function () {
        bindHttp.getPublicForm({ link: 1 }).success(function (r) {
            if (r) {
                $scope.public_form = r;
            }
        });
    };

    $scope.getPublicDirection = function (form) {
        bindHttp.getAllDirection({ form: form }).success(function (r) {
            if (r) {
                $scope.public_direction = r;
            }
        });
    };

    $scope.getPublicSpec = function (form, direction) {
        $scope.current_form = form;
        bindHttp.getPublicSpec({ form: form, direction: direction }).success(function (r) {
            $scope.public_spec = r;
        });
    };

    $scope.getBindCities = function (spec) {
        $scope.currentPackageData = $scope.public_spec.find((item) => item.id === spec);

        bindHttp.getBindCities({ spec: spec }).success(function (response) {
            if (response) {
                $scope.packages = response;
                $scope.packagesDataByDirection = $scope.public_spec.filter(
                    (item) =>
                        item.id_direction === $scope.currentPackageData.id_direction &&
                        item.id_form === $scope.currentPackageData.id_form
                );
            }
        });
    };

    /**
     * Замена методпакета во всех связях
     * @param packageReplacementId {number} Идентификатор заменяющего методпакета
     * @return void
     */
    $scope.changeAllConnectionPackage = (packageReplacementId) => {
        bindHttp
            .changeAllConnectionPackage({ currentPackageId: $scope.current_spec, packageReplacementId })
            .success((response) => {
                if (response.result) {
                    $scope.current_spec = packageReplacementId;
                    $scope.getBindCities(packageReplacementId);
                }

                $scope.showNotification(response.result, response.message);
            });
    };

    /**
     * Замена доступности во всех связях
     * @param availabilityPackageReplacementId {number} Идентификатор заменяющего методпакета
     * @return void
     */
    $scope.changeAllAvailabilityPackage = (availabilityPackageReplacementId) => {
        bindHttp
            .changeAllAvailabilityPackage({ currentPackageId: $scope.current_spec, availabilityPackageReplacementId })
            .success((response) => {
                if (response.result) {
                    $scope.packages.forEach((item) => (item.availability = availabilityPackageReplacementId));
                }

                $scope.showNotification(response.result, response.message);
            });
    };

    /**
     * Заменяет один метод пакет на другой по идентификатору связи
     * @param connectionId {number} Идентификатор заменяющего методпакета
     * @return void
     */
    $scope.changeConnectionPackage = (connectionId) => {
        bindHttp
            .changeConnectionPackage({ connectionId, packageReplacementId: $scope.connection[connectionId] })
            .success((response) => {
                if (response.result) {
                    $scope.packages = $scope.packages.filter((item) => item.public_spec_id !== connectionId);
                }

                $scope.showNotification(response.result, response.message);
            })
            .catch(() => $scope.showNotification(false, $filter('translate')('availability_unchanged')));
    };

    /**
     * Заменяет доступность у методпакета
     * @param connectionId
     * @param availabilityId
     * @return void
     */
    $scope.changeAvailabilityPackage = (connectionId, availabilityId) => {
        bindHttp
            .changeAvailabilityPackage({ connectionId, availabilityId })
            .success((response) => $scope.showNotification(response.result, response.message))
            .catch(() => $scope.showNotification(false, $filter('translate')('availability_unchanged')));
    };

    /**
     * Устанавливает значение заменяющего методпакета
     * @param id {number} Идентификатор заменяющего методпакета
     * @return void
     */
    $scope.setPackageReplacementId = (id) => {
        $scope.packageReplacementId = id;
    };

    /**
     * Устанавливает значение заменяющей доступности
     * @param id {number} Идентификатор заменяющей доступности
     * @return void
     */
    $scope.setAvailabilityPackageReplacementId = (id) => {
        $scope.availabilityReplacementId = id;
    };

    /**
     * Вызывает модальное окно
     * @param event {Event} Объект события
     * @param type {string} Тип отображения модального окна
     * @return void
     */
    $scope.onModal = (event, type = 'package') => {
        const modalParameters = $scope.parametersModal;
        modalParameters.title =
            type === 'package'
                ? $filter('translate')('replace_current_package_method')
                : $filter('translate')('replace_availability_current_package_method');

        const confirm = $mdDialog.confirm(modalParameters);

        $mdDialog
            .show(confirm)
            .then((result) =>
                result
                    ? type === 'package'
                        ? $scope.changeAllConnectionPackage($scope.packageReplacementId)
                        : $scope.changeAllAvailabilityPackage($scope.availabilityReplacementId)
                    : null
            );
    };

    /**
     * Показывает уведомление с результатом
     * @param result {boolean}
     * @param message {string}
     */
    $scope.showNotification = (result, message) => {
        const className = result ? 'green' : 'red';

        $mdToast.show({
            hideDelay: 4000,
            position: 'top right',
            template: `<md-toast class="md-toast ${className}">${message}</md-toast>`,
        });
    };

    $scope.getPublicForm();
    $scope.getPublicSpec($scope.current_form, $scope.current_direction);
}
