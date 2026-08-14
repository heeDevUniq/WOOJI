/**
 * WOOJI 공통 JS
 * - JWT 토큰 관리 (localStorage)
 */
var wooji = (function ($) {

    var TOKEN_KEY = 'wooji_access_token';
    var REFRESH_KEY = 'wooji_refresh_token';
    var USER_KEY = 'wooji_user';

    function getAccessToken() { return localStorage.getItem(TOKEN_KEY); }
    function getRefreshToken() { return localStorage.getItem(REFRESH_KEY); }

    function setLogin(data) {
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        localStorage.setItem(REFRESH_KEY, data.refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify({
            userId: data.userId, email: data.email,
            nickname: data.nickname, profileImage: data.profileImage
        }));
    }

    function getUser() {
        var raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    }

    function clear() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
    }

    function goLogin() {
        clear();
        location.href = '/login';
    }

    /* 로그인 필수 페이지 가드, 미로그인이면 리다이렉트 후 false 반환 - 호출부에서 return 할 것 */
    function requireLogin() {
        if (!getAccessToken()) {
            goLogin();
            return false;
        }
        return true;
    }

    /**
     * ajax(options)
     * options: { url, method, data(객체), success(fn), error(fn), formData(FormData) }
     */
    function ajax(options, isRetry) {
        var settings = {
            url: options.url,
            method: options.method || 'GET',
            headers: {},
            success: function (res) {
                if (options.success) options.success(res.data, res);
            },
            error: function (xhr) {
                if (xhr.status === 401 && !isRetry && getRefreshToken()) {
                    refreshAndRetry(options);
                    return;
                }
                if (xhr.status === 401) {
                    goLogin();
                    return;
                }
                var msg = (xhr.responseJSON && xhr.responseJSON.message) || '요청에 실패했습니다.';
                if (options.error) {
                    options.error(msg, xhr);
                } else {
                    alert(msg);
                }
            }
        };

        var token = getAccessToken();
        if (token) {
            settings.headers['Authorization'] = 'Bearer ' + token;
        }

        if (options.formData) {
            settings.data = options.formData;
            settings.processData = false;
            settings.contentType = false;
        } else if (options.data && settings.method !== 'GET') {
            settings.data = JSON.stringify(options.data);
            settings.contentType = 'application/json; charset=utf-8';
        } else if (options.data) {
            settings.data = options.data;
        }

        $.ajax(settings);
    }

    /* Access Token 재발급 후 원 요청 재시도 */
    function refreshAndRetry(originalOptions) {
        $.ajax({
            url: '/api/auth/refresh',
            method: 'POST',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify({ refreshToken: getRefreshToken() }),
            success: function (res) {
                localStorage.setItem(TOKEN_KEY, res.data.accessToken);
                ajax(originalOptions, true);
            },
            error: function () {
                goLogin();
            }
        });
    }

    function logout() {
        function toMain() { clear(); location.href = '/main'; }
        ajax({
            url: '/api/auth/logout',
            method: 'POST',
            data: { refreshToken: getRefreshToken() },
            success: toMain,
            error: toMain
        });
    }

    /**
     * 프로필 1개 HTML - 프로필 이미지가 있으면 이미지, 없으면 닉네임 첫 글자
     * avatarHtml(nickname, profileImage, extraClass, elementClass)
     */
    function avatarHtml(nickname, profileImage, extraClass, elementClass) {
        var cls = (elementClass || 'av') + (extraClass ? ' ' + extraClass : '');
        var name = escapeHtml(nickname || '?');
        if (profileImage) {
            return '<span class="' + cls + '" title="' + name + '"'
                + ' style="background-image:url(\'' + escapeHtml(profileImage) + '\');"></span>';
        }
        return '<span class="' + cls + '" title="' + name + '">'
            + escapeHtml((nickname || '?').charAt(0)) + '</span>';
    }

    /**
     * 현재 위치 요청
     */
    function locate(onSuccess) {
        if (!navigator.geolocation) {
            alert('이 브라우저는 위치 정보를 지원하지 않아요.');
            return;
        }

        function request() {
            navigator.geolocation.getCurrentPosition(
                onSuccess,
                function (err) {
                    if (err && err.code === 1) {            // PERMISSION_DENIED
                        showLocationGuide();
                    } else if (err && err.code === 3) {     // TIMEOUT
                        alert('위치를 확인하는 데 시간이 오래 걸려요.\n잠시 후 다시 시도해주세요.');
                    } else {                                // POSITION_UNAVAILABLE
                        alert('위치를 확인할 수 없어요.\n기기의 위치 서비스(GPS)가 켜져 있는지 확인해주세요.');
                    }
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
        }

        // 차단 상태면 허용창이 뜨지 않으므로 미리 확인해 안내로 분기
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' })
                .then(function (status) {
                    if (status.state === 'denied') { showLocationGuide(); return; }
                    request();   // granted 또는 prompt(허용창 표시)
                })
                .catch(request);
        } else {
            request();
        }
    }

    /** 권한이 이미 허용된 경우 */
    function locateIfAllowed(onSuccess) {
        if (!navigator.geolocation) return;
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' }).then(function (status) {
                if (status.state === 'granted') {
                    navigator.geolocation.getCurrentPosition(onSuccess, function () {}, { maximumAge: 300000 });
                }
            }).catch(function () {});
        }
    }

    /** 위치 권한 차단 시 재허용 안내 */
    function showLocationGuide() {
        if ($('#locGuide').length) { $('#locGuide').show(); return; }
        $('<div class="modal-back" id="locGuide">'
            + '<div class="modal" style="width:400px;">'
            + '<h3>📍 위치 권한이 차단되어 있어요</h3>'
            + '<p style="font-size:14px; color:var(--sub); line-height:1.7;">'
            + '브라우저에서 위치 사용이 차단된 상태라 허용창을 다시 띄울 수 없어요.<br>'
            + '아래 방법으로 허용해주세요.</p>'
            + '<ol style="font-size:13px; color:var(--sub); line-height:1.9; margin:14px 0 0 18px;">'
            + '<li>주소창 왼쪽의 <b>자물쇠(또는 ⓘ)</b> 아이콘 클릭</li>'
            + '<li><b>위치</b> 항목을 <b>허용</b>으로 변경</li>'
            + '<li>페이지 새로고침 후 다시 시도</li>'
            + '</ol>'
            + '<div class="btn-row">'
            + '<button class="btn" id="locGuideClose">닫기</button>'
            + '<button class="btn btn-primary" id="locGuideReload">새로고침</button>'
            + '</div></div></div>').appendTo('body');

        $('#locGuideClose').on('click', function () { $('#locGuide').hide(); });
        $('#locGuideReload').on('click', function () { location.reload(); });
        $('#locGuide').show();
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    return {
        ajax: ajax,
        setLogin: setLogin,
        getUser: getUser,
        requireLogin: requireLogin,
        logout: logout,
        goLogin: goLogin,
        escapeHtml: escapeHtml,
        avatarHtml: avatarHtml,
        locate: locate,
        locateIfAllowed: locateIfAllowed
    };

})(jQuery);
