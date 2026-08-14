<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>우지 : 우리들의 지도 - 초대</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/svg+xml" href="/resources/img/favicon.svg?v=1">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
    <link rel="stylesheet" href="/resources/css/wooji.css?v=20260837">
</head>
<body>
<div class="invite-page">
    <div class="invite-card">
        <div class="label">INVITATION</div>
        <div id="inviteInfo">
            <p style="color:var(--caption); padding:32px 0;">초대 정보를 확인하는 중…</p>
        </div>
        <button class="btn btn-coral btn-big" id="btnAccept" style="display:none;">🎉 초대 수락하기</button>
        <button class="later" id="btnLater">다음에 할게요</button>
    </div>
</div>

<script>var INVITE_CODE = '${inviteCode}';</script>
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="/resources/js/common.js?v=20260837"></script>
<script>
$(function () {
    // 미로그인 시 로그인 후 돌아오도록
    if (!wooji.getUser()) {
        location.href = '/login?redirect=' + encodeURIComponent('/invite/' + INVITE_CODE);
        return;
    }

    $('#btnLater').on('click', function () { location.href = '/main'; });

    wooji.ajax({
        url: '/api/invites/code/' + INVITE_CODE,
        success: function (invite) {
            var roleText = invite.role === 'EDITOR'
                ? '수락하면 <b>편집 멤버</b>가 돼요 — 장소 추가·댓글 작성 가능'
                : '수락하면 <b>보기 멤버</b>가 돼요 — 지도 구경·댓글 작성 가능';
            $('#inviteInfo').html(
                '<div class="emoji-tile t2">' + wooji.escapeHtml(invite.emoji || '📍') + '</div>'
                + '<h1>' + wooji.escapeHtml(invite.collection_title) + '</h1>'
                + '<div class="who"><b>' + wooji.escapeHtml(invite.created_by_nickname) + '</b>님이 초대했어요</div>'
                + '<div class="waiting">멤버 ' + (invite.member_count || 1) + '명 · 장소 '
                + (invite.place_count || 0) + '개가 기다리는 중</div>'
                + '<div class="role-info">✏️ ' + roleText + '</div>'
            );
            $('#btnAccept').show();
        },
        error: function (msg) {
            $('#inviteInfo').html('<p style="color:var(--coral); padding:32px 0;">' + wooji.escapeHtml(msg) + '</p>');
        }
    });

    $('#btnAccept').on('click', function () {
        wooji.ajax({
            url: '/api/invites/code/' + INVITE_CODE + '/accept',
            method: 'POST',
            success: function (result) {
                location.href = '/collections/' + result.collectionId;
            }
        });
    });
});
</script>
</body>
</html>
