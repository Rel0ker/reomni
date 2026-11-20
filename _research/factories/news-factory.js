'use strict';

var app = angular.module('app');

app.factory('newsHttp', [
    '$http',
    function ($http) {
        return {
            getNews: function (departmentId) {
                const params = {};

                if (departmentId) {
                    params.department_id = departmentId;
                }

                return $http.get('/news-control-center/get-news', { params: params });
            },
            getDepartments: function () {
                return $http.get('/news-control-center/get-departments');
            },
            readNews: function (newsId) {
                return $http.get('/news-control-center/mark-as-viewed', { params: { newsId } });
            },
            getEvents: function (data) {
                return $http.post('/news/get-events', data);
            },
            readEvent: function (data) {
                return $http.post('/news/read-event', data);
            },
        };
    },
]);
