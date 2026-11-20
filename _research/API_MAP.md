# Omni API map (reverse-engineered)

Base: https://omni.top-academy.ru
Auth: POST /auth/login {LoginForm:{username,password}} → PHPSESSID + city_id cookies
Change user (admin): POST /auth/change-user {id_user}

## Core teacher flow
- POST /schedule/get-schedule {week:0} → body[lenta][weekday], lents, dates, days
- POST /presents/get-presents {lenta, group?, date?} → students[], schedule, cur_*, homework
- POST /presents/set-was {visits:{key:{was,vizit,id_stud,id_schedule,primary_teach,theme}}, schedule}
- POST /presents/set-was-all {lenta,group,date,schedule}
- POST /presents/set-mark {marks:{key:{type,mark,vizit}}}  type 2=test, 4=classwork
- POST /presents/set-theme, set-comment, set-prize, stop-pair, ...

## Classwork journal
- POST /classwork/index → groups_spec
- POST /classwork/get-students {id_tgroups}
- POST /classwork/get-details {id_tgroups,source,id_spec,id_base_spec,limit,offset,year,month}
- POST /classwork/set-mark {type,mark,vizit,was}

## Groups overview
- POST /groups/get-table, /groups/get-students

## Other modules (stubs later)
homework, exams, traffic, tasks, news, dossier, portfolio, students, report, profile, bind...
