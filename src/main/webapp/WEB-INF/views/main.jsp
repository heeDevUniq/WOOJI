<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>우지 : 우리들의 지도</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@7.5.2/ol.css">
    <link rel="stylesheet" href="/resources/css/wooji.css">
</head>
<body>
<div class="header">
    <a href="/main" class="logo">🗺️ 우지 <span class="logo-sub">우리들의 지도</span></a>
    <div class="menu">
        <!-- 로그인 상태 -->
        <span id="userMenu" style="display:none;">
            <span id="nickname"></span>
            <a href="/mypage" style="margin:0 12px;">마이페이지</a>
            <button class="btn btn-sm" id="btnLogout">로그아웃</button>
        </span>
        <!-- 비로그인 상태 -->
        <span id="authMenu" style="display:none;">
            <a href="/login" class="btn btn-sm">로그인</a>
            <a href="/signup" class="btn btn-sm btn-primary">회원가입</a>
        </span>
    </div>
</div>

<div class="collection-layout">
    <div id="map"></div>

    <div class="side-panel">
        <div id="mySection">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h2 style="font-size:17px;">내 컬렉션</h2>
                <button class="btn btn-sm btn-primary" id="btnNew">+ 새 컬렉션</button>
            </div>
            <div id="collectionList"></div>
        </div>

        <div style="margin-top:8px;">
            <h2 style="font-size:17px; margin-bottom:12px;">공개 컬렉션 둘러보기</h2>
            <div class="toolbar">
                <input type="text" id="pubKeyword" placeholder="공개 컬렉션 검색" style="flex:1;">
                <button class="btn btn-sm" id="btnPubSearch">검색</button>
            </div>
            <div id="publicList"></div>
        </div>
    </div>
</div>

<!-- 컬렉션 생성 모달 -->
<div class="modal-back" id="colModal">
    <div class="modal">
        <h3 id="colModalTitle">새 컬렉션</h3>
        <input type="hidden" id="colId">
        <div class="form-group">
            <label>대표 이모지 (클릭해서 선택)</label>
            <input type="text" id="colEmoji" value="📍">
        </div>
        <div class="form-group">
            <label>제목 *</label>
            <input type="text" id="colTitle" placeholder="예: 서울 맛집">
        </div>
        <div class="form-group">
            <label>설명</label>
            <textarea id="colDesc" rows="2"></textarea>
        </div>
        <div class="form-group">
            <label>카테고리</label>
            <select id="colCategory">
                <option value="FOOD">맛집</option>
                <option value="TRAVEL">여행</option>
                <option value="CAFE">카페</option>
                <option value="ACTIVITY">액티비티</option>
                <option value="ETC">기타</option>
            </select>
        </div>
        <div class="form-group">
            <label><input type="checkbox" id="colPublic" style="width:auto;"> 공개 컬렉션으로 설정</label>
        </div>
        <div class="btn-row">
            <button class="btn" id="btnColCancel">취소</button>
            <button class="btn btn-primary" id="btnColSave">저장</button>
        </div>
    </div>
</div>

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/ol@7.5.2/dist/ol.js"></script>
<script src="/resources/js/common.js"></script>
<script src="/resources/js/emoji-picker.js"></script>
<script src="/resources/js/main.js"></script>
</body>
</html>
