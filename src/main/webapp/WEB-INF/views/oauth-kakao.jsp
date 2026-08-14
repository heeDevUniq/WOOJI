<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>우지 : 우리들의 지도 - 로그인 중</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/svg+xml" href="/resources/img/favicon.svg?v=1">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
    <link rel="stylesheet" href="/resources/css/wooji.css?v=20260837">
</head>
<body>
<div class="auth-page">
    <div class="auth-card" style="text-align:center; padding:56px 36px;">
        <img class="brand-icon" src="/resources/img/favicon.svg?v=1" alt="WOOJI"
             style="width:56px; margin:0 auto 16px; display:block;">
        <div id="oauthMsg" style="font-size:15px; font-weight:600;">카카오 계정으로 로그인 중…</div>
        <div id="oauthSub" style="font-size:13px; color:var(--caption); margin-top:8px;">잠시만 기다려주세요</div>
        <button class="btn btn-primary btn-big" id="btnRetry" style="display:none; margin-top:22px;">로그인 화면으로</button>
    </div>
</div>

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="/resources/js/common.js?v=20260837"></script>
<script>
$(function () {
    var params = new URLSearchParams(location.search);
    var code = params.get('code');
    var state = params.get('state');
    var error = params.get('error');

    function fail(msg) {
        $('#oauthMsg').text('로그인하지 못했어요');
        $('#oauthSub').text(msg || '다시 시도해주세요.');
        $('#btnRetry').show();
    }

    $('#btnRetry').on('click', function () { location.href = '/login'; });

    if (error || !code) {
        fail(error === 'access_denied' ? '카카오 로그인을 취소했어요.' : null);
        return;
    }

    $.ajax({
        url: '/api/auth/kakao',
        method: 'POST',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify({ code: code }),
        success: function (res) {
            if (res && res.success) {
                wooji.setLogin(res.data);
                location.replace(state ? decodeURIComponent(state) : '/main');
            } else {
                fail(res && res.message);
            }
        },
        error: function (xhr) {
            fail((xhr.responseJSON && xhr.responseJSON.message) || '잠시 후 다시 시도해주세요.');
        }
    });
});
</script>
</body>
</html>
