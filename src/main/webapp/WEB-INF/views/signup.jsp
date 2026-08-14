<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>우지 : 우리들의 지도 - 회원가입</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/svg+xml" href="/resources/img/favicon.svg?v=1">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
    <link rel="stylesheet" href="/resources/css/wooji.css?v=20260837">
</head>
<body>
<div class="auth-page">
    <div class="auth-card">
        <span class="deco" style="top:44px; left:calc(50% - 132px); font-size:26px; transform:rotate(-10deg);">🗺️</span>
        <span class="deco" style="top:96px; left:calc(50% + 108px); font-size:24px; transform:rotate(14deg);">☕</span>

        <div class="brand">
            <a href="/main" class="brand-link" title="메인으로">
                <img class="brand-icon" src="/resources/img/favicon.svg?v=1" alt="WOOJI 앱 아이콘">
                <div class="name">WOOJI</div>
            </a>
            <div class="tagline">우리들의 지도, 지금 같이 시작해요</div>
        </div>

        <div class="form-group">
            <input type="email" id="email" placeholder="이메일 주소">
            <div class="form-hint" id="emailHint"></div>
        </div>
        <div class="form-group">
            <input type="password" id="password" placeholder="비밀번호 (8자 이상)">
        </div>
        <div class="form-group">
            <input type="password" id="password2" placeholder="비밀번호 확인">
            <div class="form-hint" id="pwHint"></div>
        </div>
        <div class="form-group">
            <input type="text" id="nickname" placeholder="닉네임">
        </div>
        <button class="btn btn-primary" id="btnSignup">가입하기</button>

        <div class="auth-foot">
            이미 계정이 있나요? <a href="/login">로그인</a>
        </div>
    </div>
</div>

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="/resources/js/common.js?v=20260837"></script>
<script>
$(function () {
    var emailOk = false;

    // 이메일 중복 확인 (blur 시)
    $('#email').on('blur', function () {
        var email = $(this).val().trim();
        if (!email) return;
        wooji.ajax({
            url: '/api/auth/check-email',
            data: { email: email },
            success: function (available) {
                emailOk = available;
                $('#emailHint')
                    .text(available ? '사용 가능한 이메일입니다.' : '이미 사용 중인 이메일입니다.')
                    .attr('class', 'form-hint ' + (available ? 'ok' : 'err'));
            }
        });
    });

    $('#password2').on('input', function () {
        var same = $('#password').val() === $(this).val();
        $('#pwHint').text(same ? '' : '비밀번호가 일치하지 않습니다.')
            .attr('class', 'form-hint err');
    });

    $('#btnSignup').on('click', function () {
        var password = $('#password').val();
        if (!emailOk) { alert('이메일 중복 확인이 필요합니다.'); return; }
        if (password.length < 8) { alert('비밀번호는 8자 이상이어야 합니다.'); return; }
        if (password !== $('#password2').val()) { alert('비밀번호가 일치하지 않습니다.'); return; }
        if (!$('#nickname').val().trim()) { alert('닉네임을 입력하세요.'); return; }

        wooji.ajax({
            url: '/api/auth/signup',
            method: 'POST',
            data: {
                email: $('#email').val().trim(),
                password: password,
                nickname: $('#nickname').val().trim()
            },
            success: function () {
                alert('가입이 완료되었습니다. 로그인해주세요.');
                location.href = '/login';
            }
        });
    });
});
</script>
</body>
</html>
