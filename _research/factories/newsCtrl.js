'use strict';

var app = angular.module('app');

app.controller('newsCtrl', ['$scope', 'newsHttp', '$sce', '$rootScope', newsController]);

function newsController($scope, newsHttp, $sce, $rootScope) {
    $scope.selectedDepartment = null;

    $scope.getDepartments = function () {
        newsHttp.getDepartments().success(function (response) {
            $scope.departments_list = response;
        });
    };

    $scope.getNews = () => {
        newsHttp.getNews($scope.selectedDepartment).success((response) => {
            $scope.news_list = response;
        });
    };

    $scope.filterByDepartment = (departmentId) => {
        $scope.selectedDepartment = departmentId || null;
        $scope.getNews();
    };

    $scope.getEvents = function () {
        newsHttp.getEvents().success(function (r) {
            $scope.events_list = r;
            $scope.active_event = $scope.events_list[0];
        });
    };

    const myWidth = window.innerWidth;

    $scope.setActiveNews = function (news) {
        $scope.active_news = news;
        $scope.readNews(news.id);
        if (myWidth < 992) {
            $scope.activeNews = news.id;
            $scope.myStyle = { fontSize: '30' };
        }
    };

    $scope.setActiveEvent = function (event) {
        $scope.active_event = event;
        $scope.readEvent(event.id);
        if (myWidth < 992) {
            $scope.activeEvent = event.id;
            $scope.myStyle = { fontSize: '30' };
        }
    };

    $scope.renderHtml = function (html_code, img) {
        if (img) {
            html_code = html_code.replace(/<img[^>]*>/g, '');
        }
        return $sce.trustAsHtml(html_code);
    };

    $scope.readNews = function (id) {
        newsHttp.readNews(id).success(function (r) {
            if (r) {
                $rootScope.getCountUnreadNews();
            }
        });
    };

    $scope.readEvent = function (id) {
        newsHttp.readEvent({ id: id }).success(function (r) {
            if (r) {
                $rootScope.getCountUnreadNews();
            }
        });
    };

    $scope.getTime = function () {
        $scope.timeCount = $scope.news_list.length;
        for (var i = 0; i < $scope.timeCount; i++) {
            $scope.news_list[i]['timeObj'] = new Date($scope.news_list[i]['time']);
        }
    };
}
