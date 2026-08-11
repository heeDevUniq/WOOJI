<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>우지 : 우리들의 지도 - 로그인</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="/resources/css/wooji.css">
</head>
<body>
<div class="form-box">
    <h1>🗺️ 우지 : 우리들의 지도<br><span style="font-size:15px; color:#666;">로그인</span></h1>
    <div class="form-group">
        <label>이메일</label>
        <input type="email" id="email" placeholder="email@example.com">
    </div>
    <div class="form-group">
        <label>비밀번호</label>
        <input type="password" id="password" placeholder="비밀번호">
    </div>
    <button class="btn btn-primary" id="btnLogin">로그인</button>
    <p style="text-align:center; margin-top:16px; font-size:13px;">
        계정이 없으신가요? <a href="/signup" style="color:#2563eb;">회원가입</a>
    </p>
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
});
</script>
</body>
</html>
