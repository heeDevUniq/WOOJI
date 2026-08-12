<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>우지 : 우리들의 지도 - 컬렉션</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="/resources/css/wooji.css">
</head>
<body>
<div class="header">
    <a href="/main" class="logo">🗺️ 우지 <span class="logo-sub">우리들의 지도</span></a>
    <div class="menu">
        <button class="btn btn-sm" id="btnMyLocation">📍 현재 위치</button>
        <button class="btn btn-sm" id="btnShare">🔗 공유</button>
        <button class="btn btn-sm" id="btnMembers">👥 멤버</button>
        <button class="btn btn-sm" id="btnEditCol">⚙️ 설정</button>
        <a href="/main" class="btn btn-sm">목록으로</a>
    </div>
    <button class="btn-menu" id="btnPanel" title="장소 목록">☰</button>
</div>
<div class="panel-backdrop" id="panelBackdrop"></div>

<div class="collection-layout">
    <div id="map"></div>

    <div class="side-panel">
        <h2><span id="colEmoji"></span> <span id="colTitle"></span></h2>
        <div class="sub">
            <span id="colDesc"></span> · <span id="myRole"></span>
        </div>

        <div class="toolbar">
            <input type="text" id="searchKeyword" placeholder="장소 검색" style="flex:1;">
            <select id="filterCategory">
                <option value="">전체</option>
                <option value="RESTAURANT">🍽️ 맛집</option>
                <option value="CAFE">☕ 카페</option>
                <option value="SIGHT">🏞️ 관광지</option>
                <option value="HOTEL">🏨 숙소</option>
                <option value="SHOP">🛍️ 쇼핑</option>
                <option value="PARKING">🅿️ 주차장</option>
                <option value="ETC">📌 기타</option>
            </select>
        </div>
        <div class="toolbar">
            <button class="btn btn-sm btn-primary" id="btnSearchPlace" style="display:none;">🔍 상호 검색으로 추가</button>
            <button class="btn btn-sm" id="btnAddPlace" style="display:none;">+ 지도 클릭으로 추가</button>
            <button class="btn btn-sm" id="btnComments">💬 댓글</button>
        </div>

        <div id="placeList"></div>
    </div>
</div>

<!-- 장소 등록/수정 모달 -->
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
        <div class="form-group"><label>태그 (콤마 구분)</label><input type="text" id="placeTags" placeholder="데이트,야경"></div>
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

<!-- 상호 검색 모달 -->
<div class="modal-back" id="poiModal">
    <div class="modal">
        <h3>🔍 상호 검색</h3>
        <div style="display:flex; gap:8px;">
            <input type="text" id="poiKeyword" placeholder="상호명 입력 (예: 광화문 국밥)"
                   style="flex:1; padding:8px 12px; border:1px solid #d1d5db; border-radius:8px;">
            <button class="btn btn-primary btn-sm" id="btnPoiSearch">검색</button>
        </div>
        <div id="poiResults" style="margin-top:12px; max-height:320px; overflow-y:auto;"></div>
        <div class="btn-row"><button class="btn" id="btnPoiClose">닫기</button></div>
    </div>
</div>

<!-- 공유 모달 -->
<div class="modal-back" id="shareModal">
    <div class="modal">
        <h3>🔗 공유 / 초대</h3>
        <div class="form-group"><label>권한</label>
            <select id="inviteRole">
                <option value="VIEWER">Viewer (보기만)</option>
                <option value="EDITOR">Editor (장소 추가/수정 가능)</option>
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
        <button class="btn btn-primary" id="btnCreateInvite" style="width:100%;">초대 링크 생성</button>
        <h3 style="margin-top:20px;">발급된 링크</h3>
        <div id="inviteList" style="font-size:13px;"></div>
        <div class="btn-row"><button class="btn" id="btnShareClose">닫기</button></div>
    </div>
</div>

<!-- 멤버 모달 -->
<div class="modal-back" id="memberModal">
    <div class="modal">
        <h3>👥 멤버 / 권한</h3>
        <div id="memberList"></div>
        <div class="btn-row"><button class="btn" id="btnMemberClose">닫기</button></div>
    </div>
</div>

<!-- 댓글 모달 -->
<div class="modal-back" id="commentModal">
    <div class="modal">
        <h3>💬 댓글</h3>
        <div style="display:flex; gap:8px;">
            <input type="text" id="commentInput" placeholder="댓글 입력" style="flex:1; padding:8px 12px; border:1px solid #d1d5db; border-radius:8px;">
            <button class="btn btn-primary btn-sm" id="btnCommentAdd">등록</button>
        </div>
        <div id="commentList" style="margin-top:12px;"></div>
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
            <button class="btn btn-danger" id="btnColDelete">컬렉션 삭제</button>
            <button class="btn btn-primary" id="btnColEditSave">저장</button>
        </div>
        <button class="btn" id="btnColClone" style="width:100%; margin-top:8px;">📋 이 컬렉션 복제하기</button>
    </div>
</div>

<script>var COLLECTION_ID = ${collectionId};</script>
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoMapJsKey}&libraries=services"></script>
<script src="/resources/js/common.js"></script>
<script src="/resources/js/emoji-picker.js"></script>
<script src="/resources/js/collection.js"></script>
</body>
</html>
