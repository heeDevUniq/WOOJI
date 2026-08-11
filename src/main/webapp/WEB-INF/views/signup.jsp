<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>우지 : 우리들의 지도 - 회원가입</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="/resources/css/wooji.css">
</head>
<body>
<div class="form-box">
    <h1>🗺️ 우지 : 우리들의 지도<br><span style="font-size:15px; color:#666;">회원가입</span></h1>
    <div class="form-group">
        <label>이메일</label>
        <input type="email" id="email" placeholder="email@example.com">
        <div class="form-hint" id="emailHint"></div>
    </div>
    <div class="form-group">
        <label>비밀번호</label>
        <input type="password" id="password" placeholder="8자 이상">
    </div>
    <div class="form-group">
        <label>비밀번호 확인</label>
        <input type="password" id="password2">
        <div class="form-hint" id="pwHint"></div>
    </div>
    <div class="form-group">
        <label>닉네임</label>
        <input type="text" id="nickname" placeholder="닉네임">
    </div>
    <button class="btn btn-primary" id="btnSignup">가입하기</button>
    <p style="text-align:center; margin-top:16px; font-size:13px;">
        이미 계정이 있으신가요? <a href="/login" style="color:#2563eb;">로그인</a>
    </p>
</div>

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="/resources/js/common.js"></script>
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
