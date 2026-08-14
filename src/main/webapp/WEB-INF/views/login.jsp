<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>우지 : 우리들의 지도 - 로그인</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/svg+xml" href="/resources/img/favicon.svg?v=1">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
    <link rel="stylesheet" href="/resources/css/wooji.css?v=20260837">
</head>
<body>
<div class="auth-page">
    <div class="auth-card">
        <span class="deco" style="top:38px; left:calc(50% - 128px); font-size:26px; transform:rotate(-12deg);">🌸</span>
        <span class="deco" style="top:58px; left:calc(50% + 92px); font-size:22px; transform:rotate(18deg);">✈️</span>
        <span class="deco" style="top:118px; left:calc(50% - 152px); font-size:23px; transform:rotate(8deg);">🍜</span>
        <span class="deco" style="top:100px; left:calc(50% + 124px); font-size:25px; transform:rotate(-9deg);">⛱️</span>

        <div class="brand">
            <a href="/main" class="brand-link" title="메인으로">
                <img class="brand-icon" src="/resources/img/favicon.svg?v=1" alt="WOOJI 앱 아이콘">
                <div class="name">WOOJI</div>
            </a>
            <div class="tagline">친구들과 함께 채우는 우리들의 지도</div>
        </div>

        <button class="btn btn-kakao" id="btnKakao">💬 카카오로 3초만에 시작</button>

        <div class="divider">또는 이메일로</div>

        <div class="form-group">
            <input type="email" id="email" placeholder="이메일 주소">
        </div>
        <div class="form-group">
            <input type="password" id="password" placeholder="비밀번호">
        </div>
        <button class="btn btn-primary" id="btnLogin">로그인</button>

        <div class="auth-foot">
            아직 지도가 없나요? <a href="/signup">회원가입</a>
        </div>
    </div>
</div>

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="/resources/js/common.js"></script>
<script>
$(function () {
    function doLogin() {
        wooji.ajax({
            url: '/api/auth/login',
            method: 'POST',
            data: { email: $('#email').val(), password: $('#password').val() },
            success: function (data) {
                wooji.setLogin(data);
                var redirect = new URLSearchParams(location.search).get('redirect');
                location.href = redirect || '/main';
            }
        });
    }
    $('#btnLogin').on('click', doLogin);
    $('#password').on('keydown', function (e) { if (e.key === 'Enter') doLogin(); });

    // 카카오 로그인
    $('#btnKakao').on('click', function () {
        var restKey = '${kakaoRestKey}';
        var redirectUri = '${kakaoRedirectUri}';
        if (!restKey) {
            alert('카카오 로그인이 설정되지 않았어요.');
            return;
        }
        var redirect = new URLSearchParams(location.search).get('redirect') || '/main';
        location.href = 'https://kauth.kakao.com/oauth/authorize'
            + '?client_id=' + encodeURIComponent(restKey)
            + '&redirect_uri=' + encodeURIComponent(redirectUri)
            + '&response_type=code'
            + '&state=' + encodeURIComponent(redirect);
    });
});
</script>
</body>
</html>
