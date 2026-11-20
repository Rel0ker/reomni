/**
 * Created by vovk on 09.08.2016.
 */
var login_app = angular.module('login');

login_app.factory('loginHttp', [
    '$http',
    function ($http) {
        return {
            getAuth: function (data) {
                return $http.post('/auth/login', data);
            },
            sendRestorePass: function (data) {
                return $http.post('/auth/restore-password', data);
            },
        };
    },
]);
