<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>우지 : 우리들의 지도 - 컬렉션</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/svg+xml" href="/resources/img/favicon.svg?v=1">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
    <link rel="stylesheet" href="/resources/css/wooji.css?v=20260837">
</head>
<body class="map-page">
<div id="map"></div>

<!-- 좌상단: 컬렉션 헤더 -->
<div class="float-card col-head">
    <a href="/main" class="back">←</a>
    <div class="emoji-tile t1" id="colEmojiTile"><span id="colEmoji">📍</span></div>
    <div class="titles">
        <div class="t" id="colTitle"></div>
        <div class="s" id="colSub"></div>
    </div>
    <div class="avatar-group head-avatars" id="headAvatars"></div>
    <div class="actions">
        <button class="btn btn-sm btn-tint" id="btnShare">🔗<span class="btn-label"> 공유</span></button>
        <button class="btn btn-sm" id="btnMembers">👥</button>
        <button class="btn btn-sm" id="btnEditCol">⚙️</button>
    </div>
</div>

<!-- 좌하단: 지도 컨트롤 -->
<div class="map-ctrl">
    <button id="btnZoomIn" title="확대">＋</button>
    <button id="btnZoomOut" title="축소">－</button>
    <button id="btnMyLocation" title="현재 위치">🧭</button>
</div>

<!-- 장소 추가 모드 안내 -->
<div class="add-hint" id="addHint">지도를 클릭해 위치를 선택하세요 · 취소하려면 여기를 누르세요</div>

<!-- 모바일 햄버거 + 백드롭 -->
<button class="btn-menu-float" id="btnPanel" title="장소 목록">☰</button>
<div class="panel-backdrop" id="panelBackdrop"></div>

<!-- 패널 다시 열기 (데스크톱, 접었을 때만 표시) -->
<button class="panel-restore" id="btnRestore" title="패널 열기">«</button>

<!-- 우측 패널: 장소 목록 -->
<div class="float-panel">
    <div class="panel-head">
        <div class="panel-title">
            <span>장소 <span id="placeCount" style="color:var(--blue);"></span></span>
            <button class="panel-collapse" id="btnCollapse" title="패널 접기">»</button>
        </div>
        <div class="chips" id="categoryChips"></div>
        <div style="margin-top:12px; display:flex; gap:8px;">
            <input type="text" id="searchKeyword" placeholder="이 컬렉션에서 검색"
                   style="flex:1; border:1.5px solid var(--line); border-radius:12px; padding:9px 14px; outline:none; font-size:13px;">
        </div>
    </div>
    <div class="panel-body">
        <div id="placeList"></div>
    </div>
    <div class="panel-foot">
        <button class="btn btn-primary btn-big" id="btnAddPlace" style="display:none;">+ 장소 추가</button>
        <button class="btn btn-round" id="btnComments" title="댓글">💬</button>
    </div>
</div>

<!-- 장소 추가(상호 검색) 모달 -->
<div class="modal-back" id="poiModal">
    <div class="modal">
        <h3>장소 추가</h3>
        <div style="display:flex; gap:8px;">
            <input type="text" id="poiKeyword" placeholder="상호명 검색 (예: 어니언 성수)"
                   style="flex:1; border:1.5px solid var(--line); border-radius:12px; padding:11px 14px; outline:none;">
            <button class="btn btn-primary btn-sm" id="btnPoiSearch">검색</button>
        </div>
        <div id="poiResults" style="margin-top:12px; max-height:300px; overflow-y:auto;"></div>
        <button class="btn btn-big" id="btnMapPick" style="margin-top:12px;">🗺️ 지도에서 직접 선택</button>
        <div class="btn-row"><button class="btn" id="btnPoiClose">닫기</button></div>
    </div>
</div>

<!-- 장소 등록/상세 모달 -->
<div class="modal-back" id="placeModal">
    <div class="modal">
        <h3 id="placeModalTitle">장소 등록</h3>
        <input type="hidden" id="placeId">
        <input type="hidden" id="placeLat">
        <input type="hidden" id="placeLng">
        <div class="form-group"><label>장소명 *</label><input type="text" id="placeName"></div>
        <div class="form-group"><label>주소</label><input type="text" id="placeAddress"></div>
        <div class="form-group"><label>카테고리</label>
            <select id="placeCategory">
                <option value="RESTAURANT">🍽️ 맛집</option>
                <option value="CAFE">☕ 카페</option>
                <option value="SIGHT">🏞️ 관광지</option>
                <option value="HOTEL">🏨 숙소</option>
                <option value="SHOP">🛍️ 쇼핑</option>
                <option value="PARKING">🅿️ 주차장</option>
                <option value="ETC">📌 기타</option>
            </select>
        </div>
        <div class="form-group"><label>태그 (콤마 구분)</label><input type="text" id="placeTags" placeholder="베이커리,창고감성"></div>
        <div class="form-group" id="photoGroup" style="display:none;">
            <label>사진 업로드</label><input type="file" id="placePhoto" accept="image/*">
            <div id="photoList" style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;"></div>
        </div>
        <div class="btn-row">
            <button class="btn" id="btnPlaceCancel">취소</button>
            <button class="btn btn-danger" id="btnPlaceDelete" style="display:none;">삭제</button>
            <button class="btn btn-primary" id="btnPlaceSave">저장</button>
        </div>
    </div>
</div>

<!-- 공유 모달 -->
<div class="modal-back" id="shareModal">
    <div class="modal">
        <h3>🔗 공유 / 초대</h3>
        <div class="form-group"><label>권한</label>
            <select id="inviteRole">
                <option value="VIEWER">보기 (구경만 가능)</option>
                <option value="EDITOR">편집 (장소 추가·수정 가능)</option>
            </select>
        </div>
        <div class="form-group"><label>만료 시간</label>
            <select id="inviteExpires">
                <option value="">무기한</option>
                <option value="1">1시간</option>
                <option value="24">24시간</option>
                <option value="168">7일</option>
            </select>
        </div>
        <button class="btn btn-primary btn-big" id="btnCreateInvite">초대 링크 생성</button>
        <h3 style="margin-top:22px;">발급된 링크</h3>
        <div id="inviteList" style="font-size:13px;"></div>
        <div class="btn-row"><button class="btn" id="btnShareClose">닫기</button></div>
    </div>
</div>

<!-- 멤버 모달 -->
<div class="modal-back" id="memberModal">
    <div class="modal">
        <h3 id="memberModalTitle">멤버</h3>
        <div id="memberList"></div>
        <div class="invite-link-box" id="inviteLinkBox" style="display:none;">
            <span>🔗</span>
            <span class="url" id="inviteLinkUrl"></span>
            <button class="btn btn-primary btn-sm" id="btnCopyInvite">복사</button>
        </div>
        <div class="btn-row"><button class="btn" id="btnMemberClose">닫기</button></div>
    </div>
</div>

<!-- 댓글 모달 -->
<div class="modal-back" id="commentModal">
    <div class="modal">
        <h3 id="commentModalTitle">댓글</h3>
        <div id="commentList" style="max-height:340px; overflow-y:auto; padding-top:4px;"></div>
        <div class="cmt-input">
            <input type="text" id="commentInput" placeholder="댓글 남기기...">
            <button id="btnCommentAdd">↑</button>
        </div>
        <div class="btn-row"><button class="btn" id="btnCommentClose">닫기</button></div>
    </div>
</div>

<!-- 컬렉션 설정 모달 -->
<div class="modal-back" id="colEditModal">
    <div class="modal">
        <h3>⚙️ 컬렉션 설정</h3>
        <div class="form-group"><label>대표 이모지 (클릭해서 선택)</label><input type="text" id="editEmoji"></div>
        <div class="form-group"><label>제목</label><input type="text" id="editTitle"></div>
        <div class="form-group"><label>설명</label><textarea id="editDesc" rows="2"></textarea></div>
        <div class="form-group"><label>카테고리</label>
            <select id="editCategory">
                <option value="FOOD">맛집</option>
                <option value="TRAVEL">여행</option>
                <option value="CAFE">카페</option>
                <option value="ACTIVITY">액티비티</option>
                <option value="ETC">기타</option>
            </select>
        </div>
        <div class="form-group"><label><input type="checkbox" id="editPublic" style="width:auto;"> 공개</label></div>
        <div class="btn-row">
            <button class="btn" id="btnColEditCancel">취소</button>
            <button class="btn btn-danger" id="btnColDelete">삭제</button>
            <button class="btn btn-primary" id="btnColEditSave">저장</button>
        </div>
        <button class="btn btn-big" id="btnColClone" style="margin-top:8px;">📋 이 컬렉션 복제하기</button>
    </div>
</div>

<script>var COLLECTION_ID = ${collectionId};</script>
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoMapJsKey}&libraries=services"></script>
<script src="/resources/js/common.js?v=20260837"></script>
<script src="/resources/js/emoji-picker.js?v=20260837"></script>
<script src="/resources/js/collection.js?v=20260837"></script>
</body>
</html>
