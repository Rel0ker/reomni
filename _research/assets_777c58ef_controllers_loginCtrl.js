/**
 * Created by vovk on 09.08.2016.
 */
'use strict';

var login_module = angular.module('login');

login_module.controller('loginCtrl', [
    '$scope',
    'loginHttp',
    '$controller',
    '$location',
    'baseHttp',
    '$mdToast',
    loginController,
]);

function loginController($scope, loginHttp, $controller, $location, baseHttp, $mdToast) {
    $controller('BaseController', { $scope: $scope });
    $scope.messages = {};
    // $scope.city = null;

    // $scope.getActiveCity = function(){
    //     baseHttp.getActiveCity().success(function (r) {
    //         $scope.form.id_city = r.activeCity;
    //         angular.forEach($scope.cityList, function(v, k){
    //             if(parseInt(r.activeCity) === parseInt(v.id_city)){
    //                 $scope.city = v;
    //             }
    //         });
    //     })
    // };
    //
    // $scope.getCity = function() {
    //     baseHttp.getCityList({}).success(function (r) {
    //
    //         $scope.cityList = r;
    //         $scope.getActiveCity();
    //         angular.forEach($scope.cityList, function(v, k){
    //             if(v.id_city == $scope.city){
    //                 $scope.city = v;
    //             }
    //         });
    //         $scope.prepareCitiesList($scope.cityList, 'translate_key', 'firstKey', 'sortKey');
    //         $scope.sortCities($scope.cityList, 'sortKey');
    //         $scope.addedFirstLetterForSort($scope.cityList, 'firstKey', 'translate_key');
    //     })
    // };

    $scope.getAuth = function () {
        loginHttp.getAuth({ LoginForm: $scope.form }).success(function (r) {
            if (r.success == true) {
                //создаем хеш sessionStorage уникальный для каждого пользователя (md5 c данными id города + id_teach)
                if (r.IdLocalHash) {
                    sessionStorage.setItem('IdLocalHash', r.IdLocalHash);
                    sessionStorage.removeItem('isWarned');
                }
                window.location.replace('/#/schedulePage');
            } else if (r.error_permission) {
                window.location.replace('/');
            } else if (r.error) {
                if (r['error']['id_city']) {
                    $mdToast.show(
                        $mdToast
                            .simple({ hideDelay: 3000, position: 'top right' })
                            .toastClass('login-error')
                            .textContent(r.error.id_city[0])
                    );
                } else if (r['error']['password']) {
                    $mdToast.show(
                        $mdToast
                            .simple({ hideDelay: 3000, position: 'top right' })
                            .toastClass('login-error')
                            .textContent(r.error.password[0])
                    );
                } else {
                    $mdToast.show(
                        $mdToast
                            .simple({ hideDelay: 3000, position: 'top right' })
                            .toastClass('login-error')
                            .textContent(r.error.username[0])
                    );
                }
            }
        });
    };

    window.localStorage.clear();
    // $scope.getCity();
}
