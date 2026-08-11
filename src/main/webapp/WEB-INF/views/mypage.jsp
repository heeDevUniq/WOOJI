<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>우지 : 우리들의 지도 - 마이페이지</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="/resources/css/wooji.css">
</head>
<body>
<div class="header">
    <a href="/main" class="logo">🗺️ 우지 <span class="logo-sub">우리들의 지도</span></a>
    <div class="menu">
        <a href="/main">내 컬렉션</a>
        <button class="btn btn-sm" id="btnLogout">로그아웃</button>
    </div>
</div>

<div class="form-box">
    <h1>마이페이지</h1>

    <div style="text-align:center; margin-bottom:20px;">
        <img id="profileImg" src="" alt=""
             style="width:88px; height:88px; border-radius:50%; object-fit:cover; background:#e5e7eb; display:none;">
        <div id="profileNoImg" style="width:88px; height:88px; border-radius:50%; background:#e5e7eb;
             display:inline-flex; align-items:center; justify-content:center; font-size:36px;">👤</div>
        <div style="margin-top:8px;">
            <input type="file" id="profileFile" accept="image/*" style="display:none;">
            <button class="btn btn-sm" id="btnProfileImg">프로필 이미지 변경</button>
        </div>
    </div>

    <div class="form-group">
        <label>이메일</label>
        <input type="text" id="email" disabled>
    </div>
    <div class="form-group">
        <label>닉네임</label>
        <input type="text" id="nickname">
    </div>
    <button class="btn btn-primary" id="btnSaveProfile">프로필 저장</button>

    <hr style="margin:24px 0; border:none; border-top:1px solid #eee;">

    <h1 style="font-size:17px;">비밀번호 변경</h1>
    <div class="form-group">
        <label>현재 비밀번호</label>
        <input type="password" id="currentPassword">
    </div>
    <div class="form-group">
        <label>새 비밀번호 (8자 이상)</label>
        <input type="password" id="newPassword">
    </div>
    <button class="btn btn-primary" id="btnChangePw">비밀번호 변경</button>

    <hr style="margin:24px 0; border:none; border-top:1px solid #eee;">

    <button class="btn btn-danger" id="btnWithdraw">회원 탈퇴</button>
</div>

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="/resources/js/common.js"></script>
<script>
$(function () {
    if (!wooji.requireLogin()) return;
    $('#btnLogout').on('click', wooji.logout);

    function loadMe() {
        wooji.ajax({
            url: '/api/users/me',
            success: function (me) {
                $('#email').val(me.email);
                $('#nickname').val(me.nickname);
                if (me.profile_image) {
                    $('#profileImg').attr('src', me.profile_image).show();
                    $('#profileNoImg').hide();
                }
            }
        });
    }
    loadMe();

    // 프로필 이미지
    $('#btnProfileImg').on('click', function () { $('#profileFile').click(); });
    $('#profileFile').on('change', function () {
        var file = this.files[0];
        if (!file) return;
        var fd = new FormData();
        fd.append('file', file);
        wooji.ajax({
            url: '/api/users/profile-image',
            method: 'POST',
            formData: fd,
            success: loadMe
        });
    });

    // 프로필 저장
    $('#btnSaveProfile').on('click', function () {
        var nickname = $('#nickname').val().trim();
        if (!nickname) { alert('닉네임을 입력하세요.'); return; }
        wooji.ajax({
            url: '/api/users/profile',
            method: 'PUT',
            data: { nickname: nickname },
            success: function () { alert('저장되었습니다.'); }
        });
    });

    // 비밀번호 변경
    $('#btnChangePw').on('click', function () {
        var newPassword = $('#newPassword').val();
        if (newPassword.length < 8) { alert('새 비밀번호는 8자 이상이어야 합니다.'); return; }
        wooji.ajax({
            url: '/api/users/password',
            method: 'PUT',
            data: {
                currentPassword: $('#currentPassword').val(),
                newPassword: newPassword
            },
            success: function () {
                alert('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
                wooji.goLogin();
            }
        });
    });

    // 회원 탈퇴
    $('#btnWithdraw').on('click', function () {
        if (!confirm('정말 탈퇴하시겠어요? 소유한 컬렉션이 모두 삭제됩니다.')) return;
        wooji.ajax({
            url: '/api/users/me',
            method: 'DELETE',
            success: function () {
                alert('탈퇴가 완료되었습니다.');
                wooji.goLogin();
            }
        });
    });
});
</script>
</body>
</html>
