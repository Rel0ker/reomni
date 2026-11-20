var app_module = angular.module('app');

app_module.factory('classworkHttp', [
    '$http',
    ($http) => {
        return {
            getStartData: () => {
                return $http.post('/classwork/index');
            },
            getStudents: (data) => {
                return $http.post('/classwork/get-students', data);
            },
            getTableData: (data) => {
                return $http.post('/classwork/get-details', data);
            },
            setMark: (data) => {
                return $http.post('/classwork/set-mark', data);
            },
            /**
             * Получает средние оценки.
             *
             * @param {{startDate: Date, endDate: Date, source: number, specId: number|null, baseSpecId: number|null, groupId: number }} data
             *
             * @returns {Promise}
             */
            getAverageGrades: (data) => {
                return $http.post('/classwork/get-average-grades', data);
            },
            /**
             * Устанавливает четверную оценку.
             *
             * @param {{studentId: number, grade: number, quarter: number, source: number, specId: number, baseSpecId: number|null, groupId: number}} data
             *
             * @returns {Promise}
             */
            setQuarterlyGrade: (data) => {
                return $http.post('/classwork/set-quarterly-grade', data);
            },
            /**
             * Получение четвертных оценок.
             *
             * @param {{groupId: number, source: number, specId: number, baseSpecId: number|null}} data
             *
             * @returns {Promise}
             */
            getQuarterlyGrades: (data) => {
                return $http.post('/classwork/get-quarterly-grade', data);
            },
        };
    },
]);
