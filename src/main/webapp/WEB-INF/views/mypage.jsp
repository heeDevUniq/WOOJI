<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>우지 : 우리들의 지도 - 마이페이지</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/svg+xml" href="/resources/img/favicon.svg?v=1">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
    <link rel="stylesheet" href="/resources/css/wooji.css?v=20260837">
</head>
<body>
<div class="header">
    <a href="/main" class="logo-mark">
        <img class="header-icon" src="/resources/img/favicon.svg?v=1" alt="WOOJI">
        WOOJI
    </a>
    <div class="menu">
        <a href="/main" class="btn btn-sm">내 컬렉션</a>
    </div>
</div>

<div class="my-box">
    <!-- 프로필: 사진 클릭으로 변경 -->
    <div class="my-profile">
        <div class="my-avatar" id="myAvatar" title="프로필 사진 변경">
            <span id="myInitial">👤</span>
            <span class="cam">📷</span>
        </div>
        <input type="file" id="profileFile" accept="image/*" style="display:none;">
        <div class="my-info">
            <input type="text" id="nickname" placeholder="닉네임">
            <div class="email" id="email"></div>
        </div>
    </div>
    <button class="btn btn-primary btn-big" id="btnSaveProfile">저장</button>

    <!-- 비밀번호 변경 (접기) -->
    <details class="my-fold">
        <summary>비밀번호 변경</summary>
        <div class="form-group"><input type="password" id="currentPassword" placeholder="현재 비밀번호"></div>
        <div class="form-group"><input type="password" id="newPassword" placeholder="새 비밀번호 (8자 이상)"></div>
        <button class="btn btn-big" id="btnChangePw">변경하기</button>
    </details>

    <div class="my-foot">
        <button class="btn btn-sm" id="btnLogout">로그아웃</button>
        <button class="link-danger" id="btnWithdraw">회원 탈퇴</button>
    </div>
</div>

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="/resources/js/common.js?v=20260837"></script>
<script>
$(function () {
    if (!wooji.requireLogin()) return;
    $('#btnLogout').on('click', wooji.logout);

    function loadMe() {
        wooji.ajax({
            url: '/api/users/me',
            success: function (me) {
                $('#email').text(me.email);
                $('#nickname').val(me.nickname);
                if (me.profile_image) {
                    $('#myAvatar').css('background-image', 'url(' + me.profile_image + ')');
                    $('#myInitial').hide();
                } else {
                    $('#myAvatar').css('background-image', '');
                    $('#myInitial').text((me.nickname || '?').charAt(0)).show();
                }
            }
        });
    }
    loadMe();

    // 아바타 클릭 -> 사진 변경
    $('#myAvatar').on('click', function () { $('#profileFile').click(); });
    $('#profileFile').on('change', function () {
        var file = this.files[0];
        if (!file) return;
        var fd = new FormData();
        fd.append('file', file);
        wooji.ajax({
            url: '/api/users/profile-image',
            method: 'POST',
            formData: fd,
            success: function (data) {
                var u = wooji.getUser() || {};
                u.profileImage = data.profileImage;
                localStorage.setItem('wooji_user', JSON.stringify(u));
                loadMe();
            }
        });
    });

    // 닉네임 저장
    $('#btnSaveProfile').on('click', function () {
        var nickname = $('#nickname').val().trim();
        if (!nickname) { alert('닉네임을 입력하세요.'); return; }
        wooji.ajax({
            url: '/api/users/profile',
            method: 'PUT',
            data: { nickname: nickname },
            success: function () {
                var u = wooji.getUser() || {};
                u.nickname = nickname;
                localStorage.setItem('wooji_user', JSON.stringify(u));
                alert('저장되었습니다.');
            }
        });
    });

    // 비밀번호 변경
    $('#btnChangePw').on('click', function () {
        var newPassword = $('#newPassword').val();
        if (newPassword.length < 8) { alert('새 비밀번호는 8자 이상이어야 합니다.'); return; }
        wooji.ajax({
            url: '/api/users/password',
            method: 'PUT',
            data: { currentPassword: $('#currentPassword').val(), newPassword: newPassword },
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
