const BusinessProject = {
    ACADEMY: 'ACADEMY',
    COLLEGE: 'COLLEGE',
    HIGHER_EDUCATION: 'HIGHER_EDUCATION',
    KINDERGARTEN: 'KINDERGARTEN',
    SCHOOL: 'SCHOOL',
    STEP2SMART: 'STEP2SMART',
    STEP2SPEAK: 'STEP2SPEAK',
    STEP2TRAVEL: 'STEP2TRAVEL',
};

/**
 * Конфигурация символов для ui-mask.
 */
const UI_MASK_DEFINITIONS = {
    maskDefinitions: {
        A: /[a-zA-Z]/,
        '*': /[a-zA-Z0-9]/,
        '&': /[a-zA-Zа-яА-Я0-9\s]+$/,
        H: /[012]/,
        '^': /[0123]/,
        M: /[012345]/,
        L: /[0-9]/,
        R: /[78]/,
        F: /[#]/,
        P: /[+0-9]/,
        9: '',
    },
};

/**
 * Маска телефона для облачных филиалов (обслуживают несколько регионов).
 */
const CLOUD_MASK = '?PLLLLL?L?L?L?L?L?L?L?L?L?L?L?L?L?L';

/**
 * Идентификаторы филиалов с расширенной маской телефона.
 */
const BRANCH_EXTEND_PHONE_MASK = Object.freeze([
    83, // Облачный
    116, // Шамбала
    24, // Москва Кутузовская
    67, // Москва Беляево
    65, // Москва Марьино
    293, // Москва Колледж
]);
