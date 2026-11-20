/**
 * Очередь обязательных отзывов преподавателя.
 */
var app_module = angular.module('app');

app_module.controller('studentsCommentCtrl', [
    '$scope',
    'studentsHttp',
    '$filter',
    '$mdToast',
    '$mdDialog',
    '$controller',
    '$element',
    studentsCommentCtrl,
]);

function studentsCommentCtrl($scope, studentsHttp, $filter, $mdToast, $mdDialog, $controller, $element) {
    $scope.commentLength = 5;
    $scope.reviewMode = 'queue';
    $scope.reviewQueue = { items: [], options: { groups: [], subjects: [] }, total: 0 };
    $scope.reviewHistory = { items: [], has_more: false, next_cursor: null };
    $scope.reviewFilters = { group: null, subject: null };
    $scope.sortDescending = false;
    $scope.selectedReview = null;
    $scope.reviewCard = null;
    $scope.reviewForm = { message: '' };
    $scope.queueLoading = false;
    $scope.cardLoading = false;
    $scope.savingReview = false;
    $scope.historyLoading = false;
    $scope.historyLoaded = false;
    $scope.selectedHistoryReview = null;
    $scope.historyForm = { message: '' };

    $scope.setReviewMode = function (mode) {
        $scope.reviewMode = mode;
        if (mode === 'history' && !$scope.historyLoaded) {
            $scope.loadReviewHistory(false);
        }
    };

    $scope.matchesReviewFilters = function (item) {
        return (
            (!$scope.reviewFilters.group || item.group_id === $scope.reviewFilters.group) &&
            (!$scope.reviewFilters.subject || item.subject_key === $scope.reviewFilters.subject)
        );
    };

    $scope.reviewOrder = function (item) {
        return item.sort_date || '9999-12-31';
    };

    $scope.toggleReviewSort = function () {
        $scope.sortDescending = !$scope.sortDescending;
    };

    $scope.metricValue = function (value, suffix) {
        if (value === null || angular.isUndefined(value)) {
            return '—';
        }
        return value + (suffix || '');
    };

    $scope.markList = function (marks) {
        return marks && marks.length ? marks.join(', ') : '—';
    };

    $scope.lessonAttendanceKey = function (was) {
        if (was === 1) {
            return 'REVIEW_QUEUE_PRESENT';
        }
        if (was === 2) {
            return 'REVIEW_QUEUE_LATE';
        }
        return 'REVIEW_QUEUE_ABSENT';
    };

    $scope.showLessonTheme = function ($event, lesson) {
        $event.stopPropagation();
        $mdToast.show($mdToast.simple({ hideDelay: 5000, position: 'top right' }).textContent(lesson.theme));
    };

    $scope.openHomeworkReview = function ($event, homework) {
        $event.stopPropagation();
        var homeworkModalScope = $scope.$new();
        homeworkModalScope.homeworkModalOnly = true;
        homeworkModalScope.reviewHomeworkId = homework.id_domzadstud;
        homeworkModalScope.onHomeworkChanged = function () {
            $scope.selectReview($scope.selectedReview, true);
        };
        $controller('homeWorkCtrl', { $scope: homeworkModalScope, $element: $element });
    };

    $scope.selectReview = function (item, forceReload) {
        if (
            !item ||
            (!forceReload &&
                $scope.selectedReview &&
                $scope.selectedReview.queue_id === item.queue_id &&
                $scope.reviewCard)
        ) {
            return;
        }
        var requestedQueueId = item.queue_id;
        $scope.selectedReview = item;
        $scope.reviewCard = null;
        $scope.reviewForm.message = '';
        $scope.cardLoading = true;
        studentsHttp
            .getReviewCard({ queue_id: item.queue_id })
            .success(function (response) {
                if ($scope.selectedReview && $scope.selectedReview.queue_id === requestedQueueId) {
                    $scope.reviewCard = response;
                }
            })
            .finally(function () {
                if ($scope.selectedReview && $scope.selectedReview.queue_id === requestedQueueId) {
                    $scope.cardLoading = false;
                }
            });
    };

    $scope.loadReviewQueue = function (preferredQueueId) {
        $scope.queueLoading = true;
        studentsHttp
            .getReviewQueue()
            .success(function (response) {
                $scope.reviewQueue = response;
                var selected = null;
                angular.forEach(response.items, function (item) {
                    if (item.queue_id === preferredQueueId) {
                        selected = item;
                    }
                });
                if (!selected && response.items.length) {
                    selected = response.items[0];
                }
                $scope.selectedReview = null;
                $scope.reviewCard = null;
                if (selected) {
                    $scope.selectReview(selected);
                }
            })
            .finally(function () {
                $scope.queueLoading = false;
            });
    };

    $scope.sendReview = function () {
        var message = ($scope.reviewForm.message || '').trim();
        if (!$scope.selectedReview || message.length < $scope.commentLength) {
            $mdToast.show({
                hideDelay: 4000,
                position: 'top right',
                template:
                    '<md-toast class="md-toast red">' +
                    $filter('translate')('approval_form_textarea_err') +
                    '</md-toast>',
            });
            return;
        }

        var review = $scope.selectedReview;
        $scope.savingReview = true;
        studentsHttp
            .setCommentList({
                data: [
                    {
                        student_id: review.student_id,
                        message: message,
                        source: review.source,
                        id_spec: review.id_spec,
                        id_base_spec: review.id_base_spec,
                        review_plan_id: review.review_plan_id,
                    },
                ],
            })
            .success(function (response) {
                if (response.counterSuccessSave !== 1) {
                    $mdToast.show({
                        hideDelay: 4000,
                        position: 'top right',
                        template:
                            '<md-toast class="md-toast red">' +
                            $filter('translate')('REVIEW_QUEUE_SAVE_ERROR') +
                            '</md-toast>',
                    });
                    return;
                }
                $mdToast.show({
                    hideDelay: 3000,
                    position: 'top right',
                    template:
                        '<md-toast class="md-toast green">' +
                        $filter('translate')('comment_save_success') +
                        '</md-toast>',
                });
                $scope.reviewForm.message = '';
                if (angular.isFunction($scope.notDoneTaskInfo)) {
                    $scope.notDoneTaskInfo();
                }
                $scope.loadReviewQueue();
            })
            .finally(function () {
                $scope.savingReview = false;
            });
    };

    $scope.selectHistoryReview = function (review) {
        $scope.selectedHistoryReview = review;
        $scope.historyForm.message = review.message;
    };

    $scope.loadReviewHistory = function (append) {
        if ($scope.historyLoading) {
            return;
        }
        if (append && !$scope.reviewHistory.next_cursor) {
            return;
        }
        var request = {};
        if (append) {
            request.before_id = $scope.reviewHistory.next_cursor;
        }
        $scope.historyLoading = true;
        studentsHttp
            .getReviewHistory(request)
            .success(function (response) {
                var previousId = $scope.selectedHistoryReview ? $scope.selectedHistoryReview.comment_id : null;
                response.items = append ? $scope.reviewHistory.items.concat(response.items) : response.items;
                $scope.reviewHistory = response;
                $scope.historyLoaded = true;
                var selected = null;
                angular.forEach(response.items, function (item) {
                    if (item.comment_id === previousId) {
                        selected = item;
                    }
                });
                if (!selected && response.items.length) {
                    selected = response.items[0];
                }
                $scope.selectedHistoryReview = null;
                $scope.historyForm.message = '';
                if (selected) {
                    $scope.selectHistoryReview(selected);
                }
            })
            .finally(function () {
                $scope.historyLoading = false;
            });
    };

    $scope.saveHistoryReview = function () {
        var message = ($scope.historyForm.message || '').trim();
        if (!$scope.selectedHistoryReview || message.length < $scope.commentLength) {
            $mdToast.show({
                hideDelay: 4000,
                position: 'top right',
                template:
                    '<md-toast class="md-toast red">' +
                    $filter('translate')('approval_form_textarea_err') +
                    '</md-toast>',
            });
            return;
        }
        $scope.savingReview = true;
        studentsHttp
            .setComments({
                id: $scope.selectedHistoryReview.comment_id,
                comment: message,
            })
            .success(function (response) {
                if (response.error) {
                    $mdToast.show({
                        hideDelay: 4000,
                        position: 'top right',
                        template:
                            '<md-toast class="md-toast red">' +
                            $filter('translate')('REVIEW_QUEUE_SAVE_ERROR') +
                            '</md-toast>',
                    });
                    return;
                }
                $mdToast.show({
                    hideDelay: 3000,
                    position: 'top right',
                    template: '<md-toast class="md-toast green">' + response.success + '</md-toast>',
                });
                $scope.selectedHistoryReview.message = message;
            })
            .finally(function () {
                $scope.savingReview = false;
            });
    };

    $scope.deleteHistoryReview = function () {
        if (!$scope.selectedHistoryReview) {
            return;
        }
        var reviewId = $scope.selectedHistoryReview.comment_id;
        var confirm = $mdDialog
            .confirm({ templateUrl: 'views/templates/confirms.html' })
            .title($filter('translate')('confirm_delete_comment'))
            .ok($filter('translate')('ok'))
            .cancel($filter('translate')('cancel'));

        $mdDialog.show(confirm).then(function () {
            studentsHttp.deleteComment({ id_comment: reviewId }).success(function (deleted) {
                if (!deleted) {
                    $mdToast.show({
                        hideDelay: 4000,
                        position: 'top right',
                        template:
                            '<md-toast class="md-toast red">' +
                            $filter('translate')('REVIEW_QUEUE_SAVE_ERROR') +
                            '</md-toast>',
                    });
                    return;
                }
                var remainingItems = [];
                angular.forEach($scope.reviewHistory.items, function (item) {
                    if (item.comment_id !== reviewId) {
                        remainingItems.push(item);
                    }
                });
                $scope.reviewHistory.items = remainingItems;
                $scope.selectedHistoryReview = null;
                $scope.historyForm.message = '';
                if (remainingItems.length) {
                    $scope.selectHistoryReview(remainingItems[0]);
                }
                $scope.loadReviewQueue();
                if (angular.isFunction($scope.notDoneTaskInfo)) {
                    $scope.notDoneTaskInfo();
                }
            });
        });
    };

    $scope.loadReviewQueue();
}
