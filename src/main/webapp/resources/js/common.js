/**
 * WOOJI 공통 JS
 * - JWT 토큰 관리 (localStorage)
 * - Ajax 래퍼: Authorization 헤더 자동 첨부, 401 시 Refresh Token으로 재발급 후 재시도
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
        escapeHtml: escapeHtml
    };

})(jQuery);
