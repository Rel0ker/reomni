<!DOCTYPE html>
<html lang="ru-RU" ng-app="app" ng-controller="baseCtrl" ng-cloak>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="shortcut icon" href="http://omni.top-academy.ru/favicon.ico?v=2"/>
    <meta name="csrf-param" content="_csrf">
<meta name="csrf-token" content="mlrhpUz4fkpNqlYX17TOsUTo_gP91tKqP863u9typ93rFJLyFK0kciHOZmOH-pric4Wbb4q5v5pm9oL0uj3ojQ==">
    <title>Not Found (#404)</title>
    <link href="/assets/d3818e84/bootstrap/dist/css/bootstrap.css?v=1792792801" rel="stylesheet">
<link href="/assets/d3818e84/angular-material/angular-material.min.css?v=1792792801" rel="stylesheet">
<link href="/assets/d3818e84/angular-tablesort/tablesort.css?v=1792792801" rel="stylesheet">
<link href="/assets/bda739c2/chosen.css?v=1792792801" rel="stylesheet">
<link href="/css/fonts.css?v=1780570262" rel="stylesheet">
<link href="/css/site.css?v=1780570262" rel="stylesheet">
<link href="/css/main.css?v=1792408098" rel="stylesheet">
<link href="/css/review-queue.css?v=1790607104" rel="stylesheet">
<script>var omniAiReviewsConfig = {"enabled":false,"id_city":0,"id_teach":0};
var currentBranchId = 0;</script>
                <!-- Google Tag Manager -->
        <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-KQ2TR72');</script>
        <!-- End Google Tag Manager -->
        <script>
        var YII_ENV = 'prod';
    </script>
    <!-- Roistat Counter Start -->
    <script>
        (function(w, d, s, h, id) {
            w.roistatProjectId = id; w.roistatHost = h;
            var p = d.location.protocol == "https:" ? "https://" : "http://";
            var u = /^.*roistat_visit=[^;]+(.*)?$/.test(d.cookie) ? "/dist/module.js" : "/api/site/1.0/"+id+"/init?referrer="+encodeURIComponent(d.location.href);
            var js = d.createElement(s); js.charset="UTF-8"; js.async = 1; js.src = p+h+u; var js2 = d.getElementsByTagName(s)[0]; js2.parentNode.insertBefore(js, js2);
        })(window, document, 'script', 'cloud.roistat.com', '3065fb4d04fb38435d27d5d988502514');
    </script>
    <!-- Roistat Counter End -->
</head>
<body class="main">
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KQ2TR72"
                      height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->
<main class="content" resize >
    <div class="open-menu-block" ng-if="!isOpenLeft()" ng-click="openSidebar()"></div>
    <md-sidenav class="md-sidenav-left main-sidenav {{isOpenLeft() ? 'sidenav-active' : ''}}"  md-component-id="left" ng-mouseleave="closeSidebar()">
        <md-content layout-margin>
            <!--            переход только для Рио-->
                            <span ng-class="{'visibility-hidden': !isOpenLeft()}">
                <div ng-controller="profileCtrl" class="avatar-holder">
                    <img class="avatar" ng-src="{{form.photo_pas}}" alt="avatar">
                </div>
                <div class="user_name"></div>
            </span>
                        <ul class="main-menu" ng-class="{'hidden-menu': !isOpenLeft()}">
                <li class="bold" ng-class="{active: activeNav == 'dossier'}"
                    ng-click="isOpenLeft() ? setActiveNow('dossier') : $event.preventDefault(); $event.stopPropagation()">
                    <a ng-click="!isOpenLeft() ?  $event.preventDefault() : '';" href="#" ui-sref="dossier" class="waves-effect waves-light icon-dossier">
                        <span class="side-text" ng-if="isOpenLeft()">{{'dossier' | translate}}</span>
                    </a>
                </li>
                <li class="bold schedulePage" ng-class="{active: activeNav == 'schedulePage'}"
                    ng-click="isOpenLeft() ? setActiveNow('schedulePage'): $event.stopPropagation(); ">
                    <a ng-click="!isOpenLeft() ?  $event.preventDefault() : '';" ui-sref="schedulePage" class="waves-effect waves-light icon-schedulePage">
                        <span class="side-text" ng-if="isOpenLeft()">{{'schedule' | translate}}</span>
                    </a>
                </li>
                <li class="bold" ng-class="{active: activeNav == 'presents'}"
                    ng-click="isOpenLeft() ? setActiveNow('presents') : $event.preventDefault(); $event.stopPropagation()">
                    <a ng-click="!isOpenLeft() ?  $event.preventDefault() : '';" ui-sref="presents" class="waves-effect waves-light icon-presents">
                        <span class="side-text" ng-if="isOpenLeft()">{{'presents' | translate}}</span>
                    </a>
                </li>
                <li class="bold" ng-class="{active: activeNav == 'classWork'}"
                    ng-click="isOpenLeft() ? setActiveNow('classWork') : $event.preventDefault(); $event.stopPropagation()">
                    <a ng-click="!isOpenLeft() ?  $event.preventDefault() : '';" ui-sref="classWork"   class="waves-effect waves-light icon-class-work">
                        <span class="side-text" ng-if="isOpenLeft()">{{'home_marks' | translate}}</span>
                    </a>
                </li>
                <li class="bold" ng-class="{active: activeNav == 'homeWork'}"
                    ng-click="isOpenLeft() ? setActiveNow('homeWork') : $event.preventDefault(); $event.stopPropagation()">
                    <a ng-click="!isOpenLeft() ?  $event.preventDefault() : '';" ui-sref="homeWork" class="waves-effect waves-light icon-homeworks">
                        <span class="side-text" ng-if="isOpenLeft()">{{'homeworks_short' | translate}}</span>
                        <div class="orange-count__wrap">
                            <span ng-show="count_new_hw > 0" class="orange-count">{{count_new_hw}}</span>
                            <span class="labWork orange-count" ng-show="count_new_lw > 0">{{count_new_lw}}</span>
                        </div>
                    </a>
                </li>
                <li class="bold" ng-class="{active: activeNav == 'exams'}"
                    ng-click="isOpenLeft() ? setActiveNow('exams') : $event.preventDefault(); $event.stopPropagation()">
                    <a ng-click="!isOpenLeft() ?  $event.preventDefault() : '';" ui-sref="exams" class="waves-effect waves-light icon-my-exams">
                        <span class="side-text" ng-if="isOpenLeft()">{{'my_exams' | translate}}</span>
                        <span class="orange-count" ng-show="count_new_exams > 0">{{count_new_exams}}</span>
                    </a>
                </li>
                <li class="bold" ng-class="{active: activeNav == 'students.list'}"
                    ng-click="isOpenLeft() ? setActiveNow('students.list') : $event.preventDefault(); $event.stopPropagation()">
                    <a ng-click="!isOpenLeft() ?  $event.preventDefault() : '';" ui-sref="students.list" class="waves-effect waves-light icon-students">
                        <span class="side-text" ng-if="isOpenLeft()">{{'students' | translate}}</span>
                    </a>
                </li>
                <li class="bold" ng-class="{active: activeNav == 'traffic'}"
                    ng-click="isOpenLeft() ? setActiveNow('traffic') : $event.preventDefault(); $event.stopPropagation()">
                    <a ng-click="!isOpenLeft() ?  $event.preventDefault() : '';" ui-sref="traffic" class="waves-effect waves-light icon-potential-losses">
                        <span class="side-text" ng-if="isOpenLeft()" >{{'potential_losses' | translate}}</span>
                        <span class="labWork orange-count" ng-show="notDoneTask.potentialLosses.counter_not_work + count_tr_stud > 0">{{notDoneTask.potentialLosses.counter_not_work + count_tr_stud}}</span>
                    </a>
                </li>
                <li class="bold" ng-class="{active: activeNav == 'bind.materials'}"
                    ng-click="isOpenLeft() ? setActiveNow('bind.materials') : $event.preventDefault(); $event.stopPropagation()">
                    <a ng-click="!isOpenLeft() ?  $event.preventDefault() : '';" ui-sref="bind.materials" class="waves-effect waves-light icon-materials">
                        <span class="side-text" ng-if="isOpenLeft()">{{'materials' | translate}}</span>
                    </a>
                </li>
                <li class="bold" ng-class="{active: activeNav == 'news' || activeNav == undefined}"
                    ng-click="isOpenLeft() ? setActiveNow('news') : $event.preventDefault(); $event.stopPropagation()">
                    <a ng-click="!isOpenLeft() ?  $event.preventDefault() : '';" ui-sref="news" class="waves-effect waves-light icon-news">
                        <span class="side-text" ng-if="isOpenLeft()">{{ 'news_label' | translate }}</span>
                        <span ng-show="count_unread_news > 0" class="orange-count">{{count_unread_news}}</span>
                    </a>
                </li>
                <li class="bold" ng-class="{active: activeNav == 'groupsPage'}"
                    ng-click="isOpenLeft() ? setActiveNow('groupsPage') : $event.preventDefault(); $event.stopPropagation()">
                    <a ng-click="!isOpenLeft() ?  $event.preventDefault() : '';" ui-sref="groupsPage" class="waves-effect waves-light icon-groups-vizit">
                        <span class="side-text" ng-if="isOpenLeft()">{{'groups_vizit' | translate}}</span>
                    </a>
                </li>
                <li ng-show="is_design" class="bold" ng-class="{active: activeNav == 'portfolio'}"
                    ng-click="isOpenLeft() ? setActiveNow('portfolio') : $event.preventDefault(); $event.stopPropagation()">
                    <a ng-click="!isOpenLeft() ?  $event.preventDefault() : '';" ui-sref="portfolio" class="waves-effect waves-light icon-portfolio">
                        <span class="side-text" ng-if="isOpenLeft()">{{'portfolio' | translate}}</span>
                        <span ng-show="count_portfolio_request > 0" class="orange-count">{{count_portfolio_request}}</span>
                    </a>
                </li>
                <li class="bold" ng-class="{active: activeNav == 'report'}"
                    ng-click="isOpenLeft() ? setActiveNow('report') : $event.preventDefault(); $event.stopPropagation()">
                    <a ng-click="!isOpenLeft() ?  $event.preventDefault() : '';" ui-sref="report" class="waves-effect waves-light icon-report">
                        <span class="side-text" ng-if="isOpenLeft()">{{'reports' | translate}}</span>
                    </a>
                </li>
                <li class="bold" ng-class="{active: activeNav == 'tasks'}"
                    ng-click="isOpenLeft() ? setActiveNow('tasks') : $event.preventDefault(); $event.stopPropagation()">
                    <a ng-click="!isOpenLeft() ?  $event.preventDefault() : '';" ui-sref="tasks"class="waves-effect waves-light icon-tasks">
                        <span class="side-text" ng-if="isOpenLeft()">{{'tasks' | translate}}</span>
                    </a>
                </li>
                <li class="bold" ng-class="{active: activeNav == 'content_author'}"
                    ng-click="isOpenLeft() ? setActiveNow('content_author') : $event.preventDefault(); $event.stopPropagation()">
                    <a ng-click="!isOpenLeft() ?  $event.preventDefault() : '';" ui-sref="content_author" class="waves-effect waves-light icon-content-author">
                        <span class="side-text" ng-if="isOpenLeft()">{{'content_author' | translate}}</span>
                    </a>
                </li>
            </ul>
        </md-content>
                        <i ng-click="closeSidebar(); $event.stopPropagation()" class="material-icons" ng-class="{'visibility-hidden': !isOpenLeft()}">chevron_left</i>
    </md-sidenav>
    <toolbar>

        
                <div ng-if="winWidth < 768" class="pull-right">
            <md-menu class="latest_news">
                <span ng-click="$mdOpenMenu($event);" class="">
                    <span><i class="material-icons menu_btn">menu</i></span>
                </span>
                <md-menu-content width="3" id="new" style="max-height: none !important;"
                                 class="md_sub_menu md_header_menu">
                    <div class="md_header_menu" flex layout="row" layout-align="space-around center">
                                                <span><a ui-sref="profile"><i class="material-icons svg-icons icon-setting"></i></a></span>
                                                <span><a ng-click="clearLocalStorage()" href="/auth/logout"><i class="material-icons svg-icons icon-exit"></i></a></span>
                    </div>
                </md-menu-content>
            </md-menu>
        </div>
        <div class="pull-right" ng-if="winWidth > 767">
            <span ng-show="notDoneTask.cityViewCounter" ng-click="showTeachingNotifications($event)" class="teaching-notifications">
                <i class="material-icons">school</i>
                <i class="count counter-notifications" ng-if="notDoneTask.counterNodDoneTask || count_tr_stud">{{notDoneTask.counterNodDoneTask + count_tr_stud}}</i>
            </span>
            <span ng-if="signalExist">
                <span class="{{countSignals != 0 ? 'count-signals' : ''}}" ng-click="showPrerenderedDialog($event)">
                    <i class="material-icons">report_problem</i>
                    <i ng-show="countSignals != 0" class="count">{{countSignals}}</i>
                </span>
            </span>
            <span>
                <md-menu class="latest_news">
                    <i class="material-icons svg-icons icon-estimation" ng-click="$mdOpenMenu($event)"></i>
                    <md-menu-content width="4" id="new" class="md_header_menu">
                        <span ng-if="avg_evaluation_lesson_mark" class="evaluation-mark">{{'avg_evaluation_mark' | translate}} <span
                                    class="evaluation-lesson_mark">{{avg_evaluation_lesson_mark}}</span></span>
                        <span ng-if="!avg_evaluation_lesson_mark" class="evaluation-mark">{{'have_not_avg_evaluation_mark' | translate}}</span>
                        <div class="star-tooltip">
                            <img class="star-tooltip__img" src="/img/home/icon-info.svg" alt="">
                            <span class="star-tooltip__text">{{'avg_evaluation_mark_info' | translate}}</span>
                        </div>
                    </md-menu-content>
                </md-menu>
            </span>
                        <span><a ng-click="openLeadForm()" title="{{ 'LEAD_FORM__BUTTON' | translate }}"><i class="material-icons">person_add</i></a></span>
            <span><a ui-sref="profile"><i class="material-icons svg-icons icon-setting"></i></a></span>
            <span><a ng-click="clearLocalStorage()" href="/auth/logout"><i class="material-icons svg-icons icon-exit"></i></a></span>
        </div>
    </toolbar>
    <div ui-view></div>
</main>
<loading></loading>

<div style="visibility: hidden">
    <div style="width: 100%" class="md-dialog-container presents internal-wrap-global not-internal-wrap"
         ng-controller="signalCtrl" ng-if="signalExist"
         id="signalModal">
        <md-dialog id="signal-layout" layout-padding="">
            <div style="" id="signalExist">
                <form class="paddingLeft paddingRight addTask">
                    <h2 class="modal_title">{{'send_signal' | translate}}</h2>
                    <div  ng-if="viewNotMaterials" ng-repeat="(k, im) in imList" style="float: left;">
                        <md-checkbox class="implementor-checkbox" ng-checked="exists(k, selected)"
                                     ng-click="toggle(k, selected);checkIsAdminOrMaster(selected)"> {{ im }}</md-checkbox>
                    </div>
                    <div class="clearfix"></div>
                    <div class="form-row datepicker-row"  ng-if="viewNotMaterials">
                        <label>
                            {{'Desired_dates' | translate}}:
                            <md-datepicker class="datepicker" md-min-date="minDate" ng-model="model.myDate"
                                           md-placeholder="{{'requested_date' | translate}}"></md-datepicker>
                        </label>
                        <md-checkbox class="quickly-checkbox implementor-checkbox" ng-model="model.quickly">
                            {{'quickly' | translate}}
                        </md-checkbox>
                    </div>
                    <div class="float-wrap" style="">
                        <div class="form-row" ng-if="viewNotMaterials">
                            <md-select class="" data-md-container-class="has_header" ng-model="cGroup"
                                       ng-change="getStudents(cGroup)" placeholder="{{'select_group' | translate}}" >
                                <md-select-header class="demo-select-header">
                                    <input ng-model="searchTerm1"
                                           type="search"
                                           placeholder="{{'search_input' | translate}}"
                                           ng-keydown="$event.stopPropagation()"
                                           class="demo-header-searchbox md-text">
                                </md-select-header>
                                <md-optgroup ng-if="groups.length > 0">
                                    <md-option ng-value="group.id_tgroups"
                                               ng-repeat="group in groups | filter:searchTerm1 | orderBy : '-order'"
                                               ng-selected="getSelectedGroup(group.id_tgroups)">
                                        {{group.name_tgroups}}
                                    </md-option>
                                </md-optgroup>
                            </md-select>
                            <md-select class="" data-md-container-class="has_header" ng-model="cStudent"
                                       placeholder="{{'select_student' | translate}}" ng-change="setStud(cStudent)">
                                <md-select-header class="demo-select-header">
                                    <input ng-model="searchTerm2"
                                           type="search"
                                           placeholder="{{'search_input' | translate}}"
                                           ng-keydown="$event.stopPropagation()"
                                           class="demo-header-searchbox md-text">
                                </md-select-header>
                                <md-optgroup ng-if="students.length > 0">
                                    <md-option ng-value="stud.id_stud"
                                               ng-repeat="stud in students | filter:searchTerm2 | orderBy : 'fio_stud'" ng-selected="getSelectedStud(stud.id_stud)">
                                        {{stud.fio_stud}}
                                    </md-option>
                                </md-optgroup>
                            </md-select>
                            <md-select ng-required="isAdminOrMaster" class=""
                                       data-md-container-class="has_header"
                                       ng-model="cRoom"
                                       placeholder="{{'select_audience' | translate}}"
                                       ng-change="setRoom(cRoom)">
                                <md-select-header class="demo-select-header">
                                    <input ng-model="searchTerm3"
                                           type="search"
                                           placeholder="{{'search_input' | translate}}"
                                           ng-keydown="$event.stopPropagation()"
                                           class="demo-header-searchbox md-text">
                                </md-select-header>
                                <md-optgroup ng-if="rooms.length > 0">
                                    <md-option ng-value="room.id_rooms" ng-repeat="room in rooms | filter:searchTerm3 | orderBy : 'num_rooms'"  ng-selected="getSelectedRoom(room.id_rooms)">
                                        {{room.num_rooms}}
                                    </md-option>
                                </md-optgroup>
                            </md-select>

                        </div>
                        <div class="problem" ng-class="{'materials_view' : !viewNotMaterials}">
                            <h5>{{'select_topic' | translate}}:</h5>
                            <md-radio-group ng-model="cProblem">

                                <md-radio-button ng-click="checkProplem(problem.name)" ng-repeat="problem in problemsList" value="{{problem.id}}"
                                                 class="md-primary">{{problem.name | translate}}
                                </md-radio-button>
                            </md-radio-group>
                        </div>
                    </div>
                    <div class="description">
                        <div class="form-field paddingLeft paddingRight">
                            <md-input-container class="md-block no_margin">
                                <label>{{'theme' | translate}}</label>
                                <input ng-model="cTheme" rows="3" md-select-on-focus>
                            </md-input-container>
                        </div>
                    </div>
                    <div class="description">
                        <div class="form-field paddingLeft paddingRight">
                            <md-input-container class="md-block no_margin">
                                <label>{{'description' | translate}}</label>
                                <textarea ng-model="cMessage" rows="3" md-select-on-focus></textarea>
                            </md-input-container>
                        </div>
                    </div>
                    <div class="">
                        <md-button type="button" class="waves-effect waves-light btn" ng-click="addSignal()">
                            {{(!editMode ? 'Create' : 'update') | translate}}
                        </md-button>
                        <md-button type="button" class="waves-effect  btn" ng-click="cancelEdit()" ng-if="editMode">
                            {{'cancel' | translate}}
                        </md-button>
                    </div>
                </form>
            </div>
            <div class="form-rowStatus">
                <md-select ng-model="statusModel" placeholder="Статус" class="md-no-underline" ng-change="getSignals()">
                    <md-option value="0">{{'not_done' | translate}}</md-option>
                    <md-option value="1">{{'done' | translate}}</md-option>
                </md-select>
                <md-input-container>
                    <label id="label-switch">{{'overdue' | translate}}</label>
                    <input type="checkbox" ng-click="modeModel = !modeModel; getSignals()">
                </md-input-container>
                <div class="status">
                    <ul>
                        <li class="new">{{'new_signal' | translate}}</li>
                        <li class="in-work">{{'in_work_signal' | translate}}</li>
                        <li class="finished">{{'finished_signal' | translate}}</li>
                        <li class="in-waiting">{{'statement_signal' | translate}}</li>
                    </ul>
                </div>
            </div>
            <h2>{{'list_of_signals' | translate}}</h2>
            <div class="table-wrapper paddingLeft paddingRight presents task_table">
                <table class="lab_work-table table bordered" id="" ng-class="modeModel ? 'past' : 'actuals'">
                    <thead>
                    <tr>
                        <th>{{'status' | translate}}</th>
                        <th>{{'Signal' | translate}}</th>
                        <th>{{'to_whom' | translate}}</th>
                        <th>{{'requested_date' | translate}}</th>
                        <th>{{'days_in_work' | translate}}</th>
                        <th>{{'control' | translate}}</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr ng-repeat="task in signalsList" ng-if="$index < modalTaskCount">
                        <td class="{{task.status | viewTaskClass}}">{{(task.status | viewStatusName) | translate}}
                        </td>
                        <td>{{task.problem_name | translate}}</td>
                        <td><div ng-if="task.implementors">{{task.implementors | viewImplementer}}</div></td>
                        <td>{{task.date_start | date:'dd-MM-yyyy'}}</td>
                        <td>{{task.date_diff}}</td>
                        <td class="iconsTd" style="width: 120px;">
                            <span><i class="material-icons" title="Редактировать" ng-click="setCurTaskEdit(task)"
                                     ng-if="task.status == 0">mode_edit</i></span>
                            <span><i class="material-icons" title="Удалить" ng-if="task.status == 0"
                                     ng-click="deleteSignal(task.id)">delete</i></span>
                            <span><i class="material-icons" ng-if="task.status == 3" ng-click="approve(task.id)">done</i></span>
                            <span><i class="material-icons replay-task" ng-if="task.status == 3" ng-click="toWork(task.id)">replay</i></span>
                        </td>
                    </tr>
                    </tbody>
                </table>
            </div>
        </md-dialog>
    </div>
</div>

<!--Модальное окно с невыполненными заданиями для преподавателя-->
<div style="visibility: hidden">
    <div style="width: 100%" class="md-open-menu-container md-whiteframe-z2 md-active md-clickable" id="teachingNotificationsModal">
        <md-dialog id="signal-layout" layout-padding="" class="modal-teaching-notifications">
            <div class="notifications-list">
                <a href="/#/homeWork" title="{{'go_to_homework_page' | translate}}">
                    <p class="title-notifications-list">{{'they_tried' | translate}}</p>
                    <p class="font-w-500">{{'check_students_homework' | translate}}</p>
                    <p>{{'unverified_homework' | translate}}: <span class="counter-notifications"  ng-class="(notDoneTask.dzStud.new_home_work > 0) ? '': 'not-color'">
                        {{notDoneTask.dzStud.new_home_work}}
                    </span>
                    </p>
                    <p> {{'unverified_homework_assignments_expired' | translate}}:
                        <span class="counter-notifications"  ng-class="(notDoneTask.dzStud.expired_home_work > 0) ? '': 'not-color'">
                        {{notDoneTask.dzStud.expired_home_work}}
                         </span>
                    </p>
                    <div class="notifications-progress-bar-wrap" style="position: relative">
                        <div ng-if="notDoneTask.dzStud.progress_bar.factDays >= 0" class="notifications-progress-bar-indicator" style="background: {{dzIndicatorBackground}}; margin: {{dzIndicatorMargin}}">
                            <div class="notifications-progress-bar-indicator-triangle" style="border-top-color: {{dzIndicatorBackground}}"></div>
                            {{notDoneTask.dzStud.progress_bar.factDays}}
                        </div>
                        <div class="notifications-progress-bar">
                        </div>
                    </div>
                    <div class="notifications-progress-bar-label">
                        <span>{{'excellent_text_mark' | translate}}</span>
                        <span style="float: right">{{'badly_text_mark' | translate}}</span>
                    </div>
                    <div class="title-notifications-progress-bar">{{'average_time_check' | translate}}</div>
                </a>
            </div>

            <div class="notifications-list">
                <a href="/#/students/comment"  title="{{'go_to_students_comment' | translate}}">
                    <p class="title-notifications-list">{{'teacher_answer_me' | translate}}</p>
                    <p class="font-w-500">{{'leave_reviews_students' | translate}}</p>
                    <p>{{'REVIEWS__REQUIRED_COUNT' | translate}}:
                        <span class="counter-notifications" ng-class="(notDoneTask.reviewsStud.count_students > 0) ? '': 'not-color'">
                            {{notDoneTask.reviewsStud.count_students}}
                        </span>
                    </p>
                    <div class="notifications-progress-bar-wrap" style="position: relative">
                        <div ng-if="notDoneTask.reviewsStud.progress_bar.factPercent >= 0" class="notifications-progress-bar-indicator" style="background: {{reviewIndicatorBackground}}; margin: {{reviewIndicatorMargin}}">
                            <div class="notifications-progress-bar-indicator-triangle" style="border-top-color: {{reviewIndicatorBackground}}"></div>
                            {{notDoneTask.reviewsStud.progress_bar.factPercent}}%
                        </div>
                        <div class="notifications-progress-bar">
                        </div>
                    </div>

                    <div class="notifications-progress-bar-label">
                        <span>{{'excellent_text_mark' | translate}}</span>
                        <span style="float: right">{{'badly_text_mark' | translate}}</span>
                    </div>
                    <div class="title-notifications-progress-bar">{{'REVIEWS__OVERDUE_PERCENT' | translate}}</div>
                </a>
            </div>

            <div class="notifications-list">
                <a href="/#/traffic" title="{{'go_to_page_feedback' | translate}}">
                    <p class="title-notifications-list">{{'attention_we_losing_it' | translate}}</p>
                    <p class="font-w-500">{{'leave_comments_students_in_potential_losses' | translate}}</p>
                    <p>{{'students_at_risk' | translate}}:
                        <span class="counter-notifications" ng-class="((notDoneTask.potentialLosses.counter_not_work + count_tr_stud) > 0) ? '': 'not-color'">
                            {{notDoneTask.potentialLosses.counter_not_work + count_tr_stud}}
                        </span>
                    </p>
                    <div class="notifications-progress-bar-wrap" style="position: relative">
                        <div ng-if="notDoneTask.potentialLosses.workedPercent >= 0" class="notifications-progress-bar-indicator" style="background: {{lossesIndicatorBackground}}; margin: {{losselIndicatorMargin}}">
                            <div class="notifications-progress-bar-indicator-triangle" style="border-top-color: {{lossesIndicatorBackground}}"></div>
                            {{notDoneTask.potentialLosses.workedPercent}}%
                        </div>
                        <div class="notifications-progress-bar"></div>
                    </div>
                    <div class="notifications-progress-bar-label">
                        <span>{{'excellent_text_mark' | translate}}</span>
                        <span style="float: right">{{'badly_text_mark' | translate}}</span>
                    </div>
                    <div class="title-notifications-progress-bar">{{'activity_work_potential_losses' | translate}}</div>

                    <div class="activity-wrap">
                        <div>
                            <p>{{'we_help_save' | translate}} - {{notDoneTask.potentialLosses.progress_bar_activity.worked}}</p>
                            <p>{{'saved' | translate}} - {{notDoneTask.potentialLosses.progress_bar_result.saved}}</p>
                        </div>
                        <div>
                            <p>{{'not_saved' | translate}} - {{notDoneTask.potentialLosses.progress_bar_result.not_saved}}</p>
                            <p>{{'loss' | translate}} - {{notDoneTask.potentialLosses.progress_bar_result.not_saved_without_teach}}</p>
                        </div>
                    </div>
                </a>
            </div>
        </md-dialog>
    </div>
</div>


<div class="lead-form-overlay" ng-show="leadFormVisible" ng-cloak>
    <div class="lead-form-card">
        <button class="lead-form-card__close" ng-click="closeLeadForm()">×</button>
        <p class="lead-form-card__title">{{ 'LEAD_FORM__TITLE' | translate }}</p>
        <div class="lead-form-field">
            <label>{{ 'LEAD_FORM__FORM_OF_EDUCATION' | translate }} <span class="lead-form-required">*</span></label>
            <select ng-model="leadForm.formOfEducationId"
                    ng-options="form.id_form as form.name_form for form in leadFormStudyForms">
                <option value="">{{ 'LEAD_FORM__FORM_OF_EDUCATION_PLACEHOLDER' | translate }}</option>
            </select>
        </div>
        <div class="lead-form-field">
            <label>{{ 'LEAD_FORM__NAME' | translate }} <span class="lead-form-required">*</span></label>
            <input type="text" ng-model="leadForm.name">
        </div>
        <div class="lead-form-field">
            <label>{{ 'LEAD_FORM__PHONE' | translate }} <span class="lead-form-required">*</span></label>
            <input type="tel" ng-model="leadForm.phone"
                   ui-mask="{{leadPhoneMask}}" ui-options="leadMaskDefinitions" ui-mask-placeholder-char="_">
        </div>
        <div class="lead-form-field">
            <label>{{ 'LEAD_FORM__EMAIL' | translate }}</label>
            <input type="text" ng-model="leadForm.email" ng-change="onLeadEmailChange()">
        </div>
        <div class="lead-form-message lead-form-message--error"
             ng-if="leadEmailTouched && leadEmailInvalid">
            {{ 'LEAD_FORM__EMAIL_INVALID' | translate }}
        </div>
        <div class="lead-form-message lead-form-message--error" ng-if="leadFormError">{{ leadFormError }}</div>
        <div class="lead-form-message lead-form-message--success" ng-if="leadFormSuccess">{{ 'LEAD_FORM__SUCCESS' | translate }}</div>
        <button class="lead-form-submit" ng-click="submitLead()" ng-disabled="!leadForm.formOfEducationId || !leadForm.name || !leadForm.phone || leadEmailInvalid || leadFormSubmitting || leadFormSuccess">
            <span class="lead-form-spinner" ng-if="leadFormSubmitting"></span>
            <span>{{ leadFormSubmitting ? ('LEAD_FORM__SUBMITTING' | translate) : ('LEAD_FORM__SUBMIT' | translate) }}</span>
        </button>
    </div>
</div>

<script src="/assets/e293fbca/jquery.js?v=1792792802"></script>
<script src="/assets/d3818e84/jquery/dist/jquery.js?v=1792792801"></script>
<script src="/assets/d3818e84/bootstrap/dist/js/bootstrap.js?v=1792792801"></script>
<script src="/js/library/d3.js?v=1780570262"></script>
<script src="/assets/d3818e84/angular/angular.min.js?v=1792792801"></script>
<script src="/assets/d3818e84/angular-ui-router/release/angular-ui-router.min.js?v=1792792801"></script>
<script src="/assets/d3818e84/angular-animate/angular-animate.min.js?v=1792792801"></script>
<script src="/assets/d3818e84/angular-aria/angular-aria.min.js?v=1792792801"></script>
<script src="/assets/d3818e84/angular-material/angular-material.min.js?v=1792792801"></script>
<script src="/assets/d3818e84/angular-messages/angular-messages.min.js?v=1792792801"></script>
<script src="/assets/d3818e84/angular-local-storage/dist/angular-local-storage.min.js?v=1792792801"></script>
<script src="/assets/d3818e84/angular-translate/angular-translate.min.js?v=1792792801"></script>
<script src="/assets/d3818e84/angular-translate-loader-url/angular-translate-loader-url.min.js?v=1792792801"></script>
<script src="/assets/d3818e84/angular-tablesort/js/angular-tablesort.js?v=1792792801"></script>
<script src="/assets/d3818e84/raven-js/dist/raven.js?v=1792792801"></script>
<script src="/assets/d3818e84/raven-js/dist/plugins/angular.js?v=1792792801"></script>
<script src="/assets/5e1096d0/angular-toarrayfilter/toArrayFilter.js?v=1792792802"></script>
<script src="/assets/bda739c2/chosen.js?v=1792792801"></script>
<script src="/assets/bda739c2/angular-chosen.min.js?v=1792792801"></script>
<script src="/assets/516cf19f/angular-rating.js?v=1792792801"></script>
<script src="/js/angular/constants.js?v=1780570262"></script>
<script src="/js/angular/ui-mask.min.js?v=1780570262"></script>
<script src="/js/angular/script.js?v=1792164528"></script>
<script src="/js/angular/create-graph.js?v=1780570262"></script>
<script src="/js/angular/directives.js?v=1780570262"></script>
<script src="/js/angular/base-factory.js?v=1780570262"></script>
<script src="/js/angular/base-controller.js?v=1789974224"></script>
<script src="/js/angular/signal/controllers/signalCtrl.js?v=1780570262"></script>
<script src="/js/angular/signal/signal-factory.js?v=1780570262"></script>
<script src="/js/angular/signal/signal-filters.js?v=1780570262"></script>
<script src="/assets/fef6961d/directives/date-range-picker-directive.js?v=1792792802"></script>
<script src="/assets/fef6961d/controllers/classWorkCtrl.js?v=1792792802"></script>
<script src="/assets/fef6961d/classwork-factory.js?v=1792792802"></script>
<script src="/assets/4b578d5f/controllers/examsCtrl.js?v=1792792802"></script>
<script src="/assets/4b578d5f/exams-factory.js?v=1792792802"></script>
<script src="/assets/4b578d5f/controllers/courseWorksCtrl.js?v=1792792802"></script>
<script src="/assets/4b578d5f/controllers/diplomaProjectsController.js?v=1792792802"></script>
<script src="/assets/aa89dcc0/controllers/homeWorkCtrl.js?v=1792792802"></script>
<script src="/assets/aa89dcc0/homeworks-factory.js?v=1792792802"></script>
<script src="/assets/aa89dcc0/homeworks-filters.js?v=1792792802"></script>
<script src="/assets/90835bb5/controllers/individualCtrl.js?v=1792792802"></script>
<script src="/assets/90835bb5/individual-factory.js?v=1792792802"></script>
<script src="/assets/9c41c95f/controllers/newsCtrl.js?v=1792792802"></script>
<script src="/assets/9c41c95f/news-factory.js?v=1792792802"></script>
<script src="/assets/fb8b7638/controllers/profileCtrl.js?v=1792792802"></script>
<script src="/assets/fb8b7638/profile-factory.js?v=1792792802"></script>
<script src="/assets/cf9e7f29/controllers/reportCtrl.js?v=1792792802"></script>
<script src="/assets/cf9e7f29/report-factory.js?v=1792792802"></script>
<script src="/assets/d26793ed/controllers/scheduleCtrl.js?v=1792792802"></script>
<script src="/assets/d26793ed/schedule_factory.js?v=1792792802"></script>
<script src="/assets/668a449b/controllers/mainStudCtrl.js?v=1792792802"></script>
<script src="/assets/668a449b/controllers/sendStudentsMailCtrl.js?v=1792792802"></script>
<script src="/assets/668a449b/controllers/studentsCommentCtrl.js?v=1792792802"></script>
<script src="/assets/668a449b/controllers/studentsCtrl.js?v=1792792802"></script>
<script src="/assets/668a449b/controllers/studentProfileCtrl.js?v=1792792802"></script>
<script src="/assets/668a449b/students-module.js?v=1792792802"></script>
<script src="/assets/668a449b/students-factory.js?v=1792792802"></script>
<script src="/assets/b390ed60/controllers/tasksCtrl.js?v=1792792802"></script>
<script src="/assets/b390ed60/tasks-factory.js?v=1792792802"></script>
<script src="/assets/7af009d2/bind_factory.js?v=1792792802"></script>
<script src="/assets/7af009d2/controllers/bindFormsCtrl.js?v=1792792802"></script>
<script src="/assets/7af009d2/controllers/bindMainCtrl.js?v=1792792802"></script>
<script src="/assets/7af009d2/controllers/bindMaterialsCtrl.js?v=1792792802"></script>
<script src="/assets/7af009d2/controllers/bindCreateMaterialsCtrl.js?v=1792792802"></script>
<script src="/assets/7af009d2/controllers/bindTeachMaterialsCtrl.js?v=1792792802"></script>
<script src="/assets/7af009d2/controllers/bindCityCtrl.js?v=1792792802"></script>
<script src="/assets/7af009d2/controllers/linkingMainCtrl.js?v=1792792802"></script>
<script src="/assets/7af009d2/controllers/linkingMethodCtrl.js?v=1792792802"></script>
<script src="/assets/7af009d2/controllers/linkingSpecCtrl.js?v=1792792802"></script>
<script src="/assets/7af009d2/controllers/bindAuthorsCtrl.js?v=1792792802"></script>
<script src="/assets/7af009d2/controllers/linkingFormCtrl.js?v=1792792802"></script>
<script src="/assets/7af009d2/controllers/logsCtrl.js?v=1792792802"></script>
<script src="/assets/7af009d2/controllers/linkingDirectionCtrl.js?v=1792792802"></script>
<script src="/assets/7af009d2/controllers/linkingEditSpecCtrl.js?v=1792792802"></script>
<script src="/assets/7af009d2/controllers/logs/materialsLogsCtrl.js?v=1792792802"></script>
<script src="/assets/7af009d2/controllers/logs/methodPackageLogsCtrl.js?v=1792792802"></script>
<script src="/assets/7af009d2/controllers/logs/mainLogsCtrl.js?v=1792792802"></script>
<script src="/assets/7af009d2/controllers/logs/methodLinkingLogsCtrl.js?v=1792792802"></script>
<script src="/assets/7af009d2/controllers/logs/methodBindLogsCtrl.js?v=1792792802"></script>
<script src="/assets/7af009d2/controllers/logs/methodPublicSpecLogsCtrl.js?v=1792792802"></script>
<script src="/assets/7af009d2/logs_factory.js?v=1792792802"></script>
<script src="/js/library/editorjs/editorjs-history.js?v=1787236569"></script>
<script src="/js/library/editorjs/editorjs-initialization.js?v=1787236569"></script>
<script src="/js/library/editorjs/editorjs-parser-initialization.js?v=1787236569"></script>
<script src="/assets/7af009d2/controllers/PacketController.js?v=1792792802"></script>
<script src="/assets/7af009d2/packet-factory.js?v=1792792802"></script>
<script src="/assets/bc555c6f/controllers/groupsCtrl.js?v=1792792802"></script>
<script src="/assets/bc555c6f/groups-factory.js?v=1792792802"></script>
<script src="/assets/530e4484/controllers/portfolioCtrl.js?v=1792792802"></script>
<script src="/assets/530e4484/portfolio-factory.js?v=1792792802"></script>
<script src="/assets/2e0652d5/presents_factory.js?v=1792792802"></script>
<script src="/assets/2e0652d5/controllers/presentsCtrl.js?v=1792792802"></script>
<script src="/assets/2e0652d5/controllers/addMaterialCtrl.js?v=1792792802"></script>
<script src="/assets/2e0652d5/controllers/addHomeWorkCtrl.js?v=1792792802"></script>
<script src="/assets/2e0652d5/controllers/addLabWorkCtrl.js?v=1792792802"></script>
<script src="/assets/7a3d6bc2/home/controllers/homeCtrl.js?v=1792792801"></script>
<script src="/assets/7a3d6bc2/home/home-factory.js?v=1792792801"></script>
<script src="/assets/7a3d6bc2/dateService.js?v=1792792801"></script>
<script src="/assets/45755a1a/controllers/certificatesCtrl.js?v=1792792802"></script>
<script src="/assets/45755a1a/certificates_factory.js?v=1792792802"></script>
<script src="/assets/ec1eb85e/controllers/dossierCtrl.js?v=1792792802"></script>
<script src="/assets/ec1eb85e/dossier-factory.js?v=1792792802"></script>
<script src="/assets/1556d5f9/controllers/TraficCtrl.js?v=1792792802"></script>
<script src="/assets/1556d5f9/traffic-factory.js?v=1792792802"></script>
<script src="/assets/986188b2/controllers/contentAuthorCtrl.js?v=1792792802"></script>
<script src="/assets/986188b2/content-factory.js?v=1792792802"></script>
<script>jQuery(function ($) {
    window['YII_ENV'] = 'prod';
});</script>
</body>
</html>
