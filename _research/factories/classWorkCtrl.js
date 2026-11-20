var app_module = angular.module('app');

app_module.controller('classWorkCtrl', ['$scope', 'classworkHttp', '$rootScope', '$mdToast', '$filter', classWorkCtrl]);

function classWorkCtrl($scope, classworkHttp, $rootScope, $mdToast, $filter) {
    /**
     * Начальный диапазон.
     *
     * @type {{start: null|Date, end: null|Date}}
     */
    $scope.range = {
        start: null,
        end: new Date(),
    };

    /**
     * Номер активного таба.
     *
     * @type {undefined|number}
     */
    $scope.class_tab = undefined;

    /**
     * Перечисление табов.
     *
     * @type {{lessonAssessment: number, testGrade: number, practicalWorkGrades: number, quarterlyGrades: number}}
     */
    $scope.enumTabs = {
        lessonAssessment: 1,
        testGrade: 2,
        practicalWorkGrades: 3,
        quarterlyGrades: 4,
    };

    /**
     * Данные четвертных оценок.
     *
     * @type {Object}
     */
    $scope.quarterlyLoading = false;
    let studentsRequestId = 0;
    let averageRequestId = 0;
    let quarterlyRequestId = 0;
    let studentsLoading = false;
    const pendingQuarterlySaves = new Map();
    const quarterlySaveVersions = new Map();
    const quarterlyCellKey = (key, studentId, quarter) => key + ":" + studentId + ":" + quarter;

    const contextKey = () => $scope.filter.group + ':' + $scope.getSubjectCacheKey();
    const showError = (error) => $mdToast.show({
        hideDelay: 4000,
        position: 'top right',
        template: '<md-toast class="md-toast red">' + $filter('translate')('save_mark_error') + '</md-toast>',
    });
    const clearAverages = () => ($scope.stud_list || []).forEach(student => student.marks = null);
    const clearQuarterly = () => ($scope.stud_list || []).forEach(student => student.quarterlyGrades = {});

    $scope.getRecommendationDetails = (student) => {
        const marks = student.marks;
        if (!marks || !marks.recommendedGradeDivider) return '';
        const categories = [
            ['lesson', 'AVERAGE__LESSON'], ['homework', 'AVERAGE__DZ'],
            ['practicalWork', 'AVERAGE__PRACTICAL'], ['test', 'AVERAGE__CONTROL'], ['finalWork', 'FINAL_TEST'],
        ];
        return [$filter('translate')('QUARTERLY_RECOMMENDATION_HINT')].concat(
            categories.filter(([type]) => marks[type + 'Count'] > 0).map(([type, key]) =>
                $filter('translate')(key) + ': ' + marks[type] +
                ' (n=' + marks[type + 'Count'] + ', ×' + marks.gradeWeights?.[type] + ')'
            ),
            marks.recommendedGradeDividend + ' / ' + marks.recommendedGradeDivider + ' ≈ ' + marks.recommendedGrade
        ).join('\n');
    };

    let d = new Date();

    $scope.years = []; // годы для фильтра
    $scope.months = []; // месяцы для фильтра

    // модель для селектов выбора года и месяца
    $scope.form = {
        year: '',
        month: '',
    };

    $scope.maxYear = d.getFullYear();
    $scope.minYear = 2014;

    $scope.getStartDate = function () {
        for (let i = $scope.minYear, j = 0; i <= $scope.maxYear; i++, j++) {
            $scope.years[j] = '' + i;
        }
    };
    $scope.getStartDate();

    $scope.filter = {};
    $scope.offset = 0;
    $scope.getStartData = function () {
        classworkHttp.getStartData().success(function (r) {
            $scope.filter_data = r.groups_spec;
            $scope.months = r.months;
            $scope.setDefaultGroup();
            $scope.setDefaultSpec(); //устанавливаем дефолтное значение
            $scope.getStudents({ id_tgroups: $scope.filter.group });
            $scope.setLimit();
            $scope.offset = 0;
            $scope.getTableData();
        });
    };

    $scope.setLimit = function () {
        var myWidth = window.innerWidth;

        if (myWidth > 1400) {
            $scope.limit = 11;
        } else if (myWidth < 1400 && myWidth > 1300) {
            $scope.limit = 10;
        } else if (myWidth < 1300 && myWidth > 1200) {
            $scope.limit = 9;
        } else if (myWidth < 1200 && myWidth > 1100) {
            $scope.limit = 8;
        } else if (myWidth < 1100 && myWidth > 1000) {
            $scope.limit = 7;
        } else if (myWidth < 1000 && myWidth > 900) {
            $scope.limit = 6;
        } else if (myWidth < 900 && myWidth > 800) {
            $scope.limit = 5;
        } else if (myWidth < 800 && myWidth > 700) {
            $scope.limit = 4;
        } else if (myWidth < 700 && myWidth > 600) {
            $scope.limit = 3;
        } else if (myWidth < 600 && myWidth > 500) {
            $scope.limit = 2;
        } else {
            $scope.limit = 1;
        }
    };

    $scope.getTableData = function () {
        var subject = $scope.getSelectedSubjectParams();

        classworkHttp
            .getTableData({
                id_tgroups: $scope.filter.group,
                source: subject.source,
                id_spec: subject.id_spec,
                id_base_spec: subject.id_base_spec,
                limit: $scope.limit,
                offset: $scope.offset,
                year: $scope.form.year,
                month: $scope.form.month,
            })
            .success(function (r) {
                $scope.data_body = r.data_body;
                $scope.table_header_full = r.data_header ? r.data_header : [];

                $scope.data_header =
                    $scope.table_header_full.length > $scope.limit
                        ? $scope.table_header_full.slice($scope.offset, $scope.limit)
                        : $scope.table_header_full;
                $scope.startPosition = $scope.table_header_full.length;
                $scope.endPosition =
                    $scope.table_header_full.length > $scope.limit ? $scope.table_header_full.length - $scope.limit : 1;
            });
    };

    $scope.setDefaultSpec = function () {
        var max = 0;
        $scope.filter.subject = null;

        angular.forEach($scope.filter_data?.[$scope.filter?.group]?.data, function (value, key) {
            if (max < value.order) {
                max = value.order;
                $scope.filter.subject = value;
            }
        });
    };

    $scope.getSelectedSubjectParams = function () {
        var subject = $scope.filter.subject || {};
        var source = Number(subject.source) === 2 ? 2 : 1;

        return {
            source: source,
            id_spec: source === 1 ? subject.id_spec : null,
            id_base_spec: source === 2 ? subject.id_base_spec : null,
        };
    };

    $scope.getSubjectCacheKey = function () {
        var subject = $scope.getSelectedSubjectParams();
        var subjectId = subject.source === 2 ? subject.id_base_spec : subject.id_spec;

        return subjectId ? subject.source + ':' + subjectId : '';
    };

    $scope.setDefaultGroup = function () {
        var max = 0;
        angular.forEach($scope.filter_data, function (value, key) {
            if (max < value.order) {
                max = value.order;
                $scope.filter.group = value.id_tgroups;
            }
        });
    };

    $scope.changeGroup = function () {
        ++averageRequestId;
        ++quarterlyRequestId;
        $scope.offset = 0;
        $scope.setDefaultSpec();
        clearAverages();
        clearQuarterly();
        $scope.getStudents({ id_tgroups: $scope.filter.group });
        $scope.getTableData();
    };

    $scope.getStudents = function (data) {
        const requestId = ++studentsRequestId;
        studentsLoading = true;
        $scope.quarterlyLoading = true;
        return classworkHttp.getStudents(data).then(function (response) {
            if (requestId !== studentsRequestId || data.id_tgroups !== $scope.filter.group) return;
            $scope.stud_list = response.data;
            studentsLoading = false;
            if ($scope.checkRangeDate()) $scope.getAverageGrades();
            if ($scope.class_tab === $scope.enumTabs.quarterlyGrades) $scope.getQuarterlyGrades();
        }).catch(function (error) {
            if (requestId !== studentsRequestId) return;
            $scope.stud_list = [];
            showError(error);
        }).finally(function () {
            if (requestId !== studentsRequestId) return;
            studentsLoading = false;
            // The quarterly request owns the loading state if this tab is open.
            if ($scope.class_tab !== $scope.enumTabs.quarterlyGrades || !$scope.stud_list.length) {
                $scope.quarterlyLoading = false;
            }
        });
    };

    $scope.changeSpec = function () {
        ++averageRequestId;
        ++quarterlyRequestId;
        $scope.offset = 0;
        $scope.getTableData();

        if ($scope.checkRangeDate()) {
            $scope.getAverageGrades();
        }

        if ($scope.class_tab === $scope.enumTabs.quarterlyGrades) {
            $scope.getQuarterlyGrades();
        }
    };

    // смена даты в фильтре
    $scope.changeDate = function () {
        $scope.offset = 0;
        $scope.getTableData();
    };

    $scope.changeOffset = function (k) {
        if ($scope.offset > 0 || k > 0) {
            $scope.offset = $scope.offset + k * $scope.limit;
        }
        $scope.data_header = $scope.table_header_full.slice($scope.offset, $scope.offset + $scope.limit);
        $scope.startPosition = $scope.table_header_full.length - $scope.offset;
        $scope.endPosition =
            $scope.table_header_full.length > $scope.offset + $scope.limit
                ? $scope.table_header_full.length - $scope.offset - $scope.limit
                : 1;
    };

    $scope.setMark = function (type, mark, vizit, was) {
        classworkHttp
            .setMark({
                type: type,
                mark: mark,
                vizit: vizit,
                was: was,
            })
            .success(function (r) {
                if (r && r.error) {
                    $mdToast.show({
                        hideDelay: 4000,
                        position: 'top right',
                        template: '<md-toast class="md-toast red">' + r.error + '</md-toast>',
                    });
                }
            });
    };

    /**
     * Отслеживает изменение диапазона.
     */
    $scope.$watch(
        'range',
        (newRange) => {
            if ($scope.checkRangeDate(newRange)) {
                $scope.getAverageGrades();
            } else {
                ++averageRequestId;
                clearAverages();
            }
        },
        true
    );

    /**
     * Отслеживает переключение табов.
     */
    $scope.$watch('class_tab', (newTabId) => {
        var subject = $scope.getSelectedSubjectParams();
        var subjectCacheKey = $scope.getSubjectCacheKey();

        if (
            newTabId !== undefined &&
            newTabId === $scope.enumTabs.quarterlyGrades &&
            subjectCacheKey
        ) {
            $scope.getQuarterlyGrades();
        }
    });

    /**
     * Получает средние оценки.
     *
     * @returns {void}
     */
    $scope.getAverageGrades = () => {
        const requestId = ++averageRequestId;
        clearAverages();
        if (studentsLoading || !$scope.checkRangeDate()) return;
        const subject = $scope.getSelectedSubjectParams();
        const key = contextKey();
        return classworkHttp.getAverageGrades({
            startDate: $scope.range.start, endDate: $scope.range.end,
            groupId: $scope.filter.group, source: subject.source,
            specId: subject.id_spec, baseSpecId: subject.id_base_spec,
        }).then(response => {
            if (requestId !== averageRequestId || key !== contextKey()) return;
            ($scope.stud_list || []).forEach(student => student.marks = response.data[student.id_stud] || null);
        }).catch(error => {
            if (requestId === averageRequestId && key === contextKey()) showError(error);
        });
    };

    $scope.getQuarterlyGrades = () => {
        const requestId = ++quarterlyRequestId;
        if (studentsLoading) return;
        const subject = $scope.getSelectedSubjectParams();
        const key = contextKey();
        const saveVersion = quarterlySaveVersions.get(key) || 0;
        clearQuarterly();
        if (!(subject.source === 2 ? subject.id_base_spec : subject.id_spec)) {
            $scope.quarterlyLoading = false;
            return;
        }
        $scope.quarterlyLoading = true;
        return classworkHttp.getQuarterlyGrades({
            groupId: $scope.filter.group, source: subject.source,
            specId: subject.id_spec, baseSpecId: subject.id_base_spec,
        }).then(response => {
            if (requestId !== quarterlyRequestId || key !== contextKey()) return;
            // A read started before a save completed may contain the old grade.
            if (saveVersion !== (quarterlySaveVersions.get(key) || 0)) {
                return $scope.getQuarterlyGrades();
            }
            ($scope.stud_list || []).forEach(student => {
                student.quarterlyGrades = {};
                for (let quarter = 1; quarter <= 4; quarter++) {
                    const grade = response.data[student.id_stud]?.[quarter] || {};
                    student.quarterlyGrades[quarter] = pendingQuarterlySaves.get(quarterlyCellKey(key, student.id_stud, quarter))
                        || Object.assign({}, grade, { savedGrade: grade.grade });
                }
            });
        }).catch(error => {
            if (requestId === quarterlyRequestId && key === contextKey()) {
                // Keep editing disabled until saved values have been loaded successfully.
                showError(error);
            }
        }).finally(() => {
            if (requestId === quarterlyRequestId && key === contextKey()) {
                $scope.quarterlyLoading = !($scope.stud_list || []).every(student => student.quarterlyGrades?.[1]);
            }
        });
    };

    /**
     * Проверяет диапазон дат.
     *
     * @param {null|Object} rangeDate
     *
     * @returns {boolean}
     */
    $scope.checkRangeDate = (rangeDate = null) => {
        const range = rangeDate ? rangeDate : $scope.range;

        return range.start !== null && range.start !== undefined && range.end !== undefined && range.end !== null;
    };

    /**
     * Устанавливает четвертную оценку.
     *
     * @param {number} studentId
     * @param {number} grade
     * @param {number} quarter
     *
     * @returns {void}
     */
    $scope.setQuarterlyGrade = (studentId, grade, quarter) => {
        const subject = $scope.getSelectedSubjectParams();
        const student = ($scope.stud_list || []).find(item => item.id_stud == studentId);
        const cell = student?.quarterlyGrades?.[quarter];
        const key = contextKey();
        const cellKey = quarterlyCellKey(key, studentId, quarter);
        if (!cell || pendingQuarterlySaves.has(cellKey) || cell.saving || $scope.quarterlyLoading ||
            !(subject.source === 2 ? subject.id_base_spec : subject.id_spec)) return;
        cell.saving = true;
        pendingQuarterlySaves.set(cellKey, cell);
        // An empty choice is sent as zero; restore the server value on any failure.
        return classworkHttp.setQuarterlyGrade({
            studentId, grade: grade || 0, quarter,
            groupId: $scope.filter.group, source: subject.source,
            specId: subject.id_spec, baseSpecId: subject.id_base_spec,
        }).then(response => {
            if (response.data !== true) throw new Error('Grade was not saved');
            cell.savedGrade = grade;
            $mdToast.show({ hideDelay: 4000, position: 'top right',
                template: '<md-toast class="md-toast green">' + $filter('translate')('save_mark_success') + '</md-toast>' });
        }).catch(error => {
            cell.grade = cell.savedGrade;
            showError(error);
        }).finally(() => {
            cell.saving = false;
            pendingQuarterlySaves.delete(cellKey);
            quarterlySaveVersions.set(key, (quarterlySaveVersions.get(key) || 0) + 1);
        });
    };

    $scope.getStartData();
}
