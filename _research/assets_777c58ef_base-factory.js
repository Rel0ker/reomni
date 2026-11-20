/**
 * Created by vovk on 11.08.2016.
 */
var login_module = angular.module('login');

login_module.factory('baseHttp', [
    '$http',
    function ($http) {
        return {
            getCityList: function (data) {
                return $http.post('/auth/get-city', data);
            },
            setCity: function (data) {
                return $http.post('/auth/set-city', data);
            },
            changeLang: function (data) {
                return $http.post('/auth/change-lang', data);
            },
            getLang: function (data) {
                return $http.post('/auth/get-base-config', data);
            },
            getActiveCity: function (data) {
                return $http.post('/auth/get-active-city', data);
            },
        };
    },
]);
