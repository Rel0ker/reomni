/**
 * Created by vovk on 05.10.2016.
 */
var app_module = angular.module('app');

app_module.controller('studentProfileCtrl', [
    '$scope',
    'studentsHttp',
    '$stateParams',
    'localStorageService',
    '$mdDialog',
    '$filter',
    '$mdToast',
    studentProfileCtrl,
]);

function studentProfileCtrl($scope, studentsHttp, $stateParams, localStorageService, $mdDialog, $filter, $mdToast) {
    $scope.stud_info = localStorageService.get('stud_object');
    $scope.stud_id = $scope.stud_info ? $scope.stud_info.id_stud : false;
    $scope.comment = { stud: $scope.stud_id, subject: null, comment: '' };
    $scope.student_comments = [];
    $scope.specs_list = [];

    function subjectRequest(stud, subject) {
        var request = { stud: stud };
        if (subject) {
            request.source = subject.source;
            request.id_spec = subject.id_spec;
            request.id_base_spec = subject.id_base_spec;
        }
        return request;
    }

    $scope.getComments = function (stud, subject) {
        studentsHttp.getComments(subjectRequest(stud, subject)).success(function (reviews) {
            $scope.student_comments = reviews;
            if ($scope.stud_info && !subject) {
                $scope.stud_info.count_comment = reviews.length;
            }
        });
    };

    $scope.getSpecs = function (stud) {
        studentsHttp.getSpecs({ stud: stud }).success(function (subjects) {
            $scope.specs_list = subjects || [];
        });
    };

    $scope.setComments = function (data) {
        var request = {
            stud: $scope.stud_id,
            id: data.id,
            comment: data.comment,
        };
        if (!data.id && data.subject) {
            request.source = data.subject.source;
            request.id_spec = data.subject.id_spec;
            request.id_base_spec = data.subject.id_base_spec;
        }
        studentsHttp.setComments(request).success(function (response) {
            if (response.error) {
                angular.forEach(response.error, function (messages) {
                    angular.forEach([].concat(messages), function (message) {
                        $mdToast.show({
                            hideDelay: 4000,
                            position: 'top right',
                            template: '<md-toast class="md-toast red">' + message + '</md-toast>',
                        });
                    });
                });
                return;
            }
            $mdToast.show({
                hideDelay: 3000,
                position: 'top right',
                template: '<md-toast class="md-toast green">' + response.success + '</md-toast>',
            });
            if (!data.id && $scope.stud_info) {
                $scope.stud_info.count_comment = parseInt($scope.stud_info.count_comment || 0, 10) + 1;
            }
            $scope.comment.comment = '';
            $scope.getComments($scope.stud_id, $scope.comment.subject);
        });
    };

    $scope.showConfirmDeleteComment = function (id) {
        var confirm = $mdDialog
            .confirm({ templateUrl: 'views/templates/confirms.html' })
            .title($filter('translate')('confirm_delete_comment'))
            .ok($filter('translate')('ok'))
            .cancel($filter('translate')('cancel'));

        $mdDialog.show(confirm).then(function () {
            studentsHttp.deleteComment({ id_comment: id }).success(function (deleted) {
                if (!deleted) {
                    return;
                }
                if ($scope.stud_info) {
                    $scope.stud_info.count_comment = Math.max(0, parseInt($scope.stud_info.count_comment || 0, 10) - 1);
                }
                $scope.getComments($scope.stud_id, $scope.comment.subject);
            });
        });
    };

    if ($scope.stud_id) {
        $scope.getComments($scope.stud_id);
        $scope.getSpecs($scope.stud_id);
    }

    $scope.getDetailsGroup = function (group) {
        studentsHttp.getGroupDetails({ group: group }).success(function (r) {
            if (r) {
                $scope.stud_info.stream = r.name_streams;
                $scope.stud_info.dir_name = r.dir_name;
                $scope.stud_info.name_tgroups = r.name_tgroups;
            }
        });
    };

    $scope.getDetailsStud = function (stud) {
        if (stud) {
            studentsHttp.getDetailsStud({ stud: stud }).success(function (r) {
                $scope.stud_info_d = r;
            });
        } else {
            goBack();
        }
    };

    $scope.getVizitInfo = function (stud) {
        if (stud) {
            studentsHttp.getVizitInfo({ stud: stud }).success(function (r) {
                if (r) {
                    $scope.vizit_info = r;
                }
            });
        } else {
            goBack();
        }
    };

    function goBack() {
        window.location.href = 'https://omni.top-academy.ru/#/students/list';
    }

    $scope.getVizitInfo($scope.stud_id);
    $scope.getDetailsStud($scope.stud_id);
}
