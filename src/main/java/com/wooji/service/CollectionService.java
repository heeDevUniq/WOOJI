package com.wooji.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wooji.common.ApiException;
import com.wooji.common.PermissionChecker;
import com.wooji.mapper.CollectionMapper;
import com.wooji.mapper.MemberMapper;
import com.wooji.mapper.PlaceMapper;

@Service
public class CollectionService {

    private final CollectionMapper collectionMapper;
    private final MemberMapper memberMapper;
    private final PlaceMapper placeMapper;
    private final PermissionChecker permission;

    public CollectionService(CollectionMapper collectionMapper, MemberMapper memberMapper, PlaceMapper placeMapper, PermissionChecker permission) {
        this.collectionMapper = collectionMapper;
        this.memberMapper = memberMapper;
        this.placeMapper = placeMapper;
        this.permission = permission;
    }

    /* 컬렉션 생성 (+ OWNER 멤버 등록) */
    @Transactional
    public Map<String, Object> create(Long userId, Map<String, Object> param) {
        if (param.get("title") == null) {
            throw new ApiException(400, "제목은 필수입니다.");
        }
        param.put("ownerId", userId);
        if (param.get("emoji") == null) param.put("emoji", "📍");
        if (param.get("isPublic") == null) param.put("isPublic", "N");
        collectionMapper.insertCollection(param);

        Long collectionId = ((Number) param.get("collectionId")).longValue();

        Map<String, Object> memberParam = new HashMap<>();
        memberParam.put("collectionId", collectionId);
        memberParam.put("userId", userId);
        memberParam.put("role", "OWNER");
        memberMapper.insertMember(memberParam);

        return collectionMapper.selectCollection(collectionId);
    }

    /* 내 컬렉션 목록 (소유 + 참여) */
    public List<Map<String, Object>> getMyCollections(Long userId) {
        return collectionMapper.selectMyCollections(userId);
    }

    /* 공개 컬렉션 목록 */
    public List<Map<String, Object>> getPublicCollections(String keyword) {
        return collectionMapper.selectPublicCollections(keyword);
    }

    /* 컬렉션 상세 (공개이거나 멤버여야 조회 가능) */
    public Map<String, Object> get(Long userId, Long collectionId) {
        Map<String, Object> collection = collectionMapper.selectCollection(collectionId);
        if (collection == null) {
            throw new ApiException(404, "컬렉션을 찾을 수 없습니다.");
        }
        String role = permission.getRole(collectionId, userId);
        if (role == null && !"Y".equals(collection.get("is_public"))) {
            throw new ApiException(403, "비공개 컬렉션입니다.");
        }
        collection.put("my_role", role);
        return collection;
    }

    /* 컬렉션 수정 (OWNER) */
    @Transactional
    public void update(Long userId, Long collectionId, Map<String, Object> param) {
        permission.checkOwner(collectionId, userId);
        param.put("collectionId", collectionId);
        collectionMapper.updateCollection(param);
    }

    /* 컬렉션 삭제 (OWNER) */
    @Transactional
    public void delete(Long userId, Long collectionId) {
        permission.checkOwner(collectionId, userId);
        collectionMapper.deleteCollection(collectionId);
    }

    /* 즐겨찾기 토글 */
    @Transactional
    public Map<String, Object> toggleFavorite(Long userId, Long collectionId) {
        permission.checkViewer(collectionId, userId);

        boolean favorite;
        if (collectionMapper.countFavorite(userId, collectionId) > 0) {
            collectionMapper.deleteFavorite(userId, collectionId);
            favorite = false;
        } else {
            collectionMapper.insertFavorite(userId, collectionId);
            favorite = true;
        }
        Map<String, Object> result = new HashMap<>();
        result.put("favorite", favorite);
        return result;
    }

    /* 복제(Clone): 컬렉션 + 장소 복사, 내가 OWNER */
    @Transactional
    public Map<String, Object> clone(Long userId, Long collectionId) {
        Map<String, Object> src = collectionMapper.selectCollection(collectionId);
        if (src == null) {
            throw new ApiException(404, "컬렉션을 찾을 수 없습니다.");
        }
        String role = permission.getRole(collectionId, userId);
        if (role == null && !"Y".equals(src.get("is_public"))) {
            throw new ApiException(403, "비공개 컬렉션은 복제할 수 없습니다.");
        }

        Map<String, Object> newCol = new HashMap<>();
        newCol.put("ownerId", userId);
        newCol.put("title", src.get("title") + " (복사본)");
        newCol.put("description", src.get("description"));
        newCol.put("emoji", src.get("emoji"));
        newCol.put("category", src.get("category"));
        newCol.put("isPublic", "N");
        collectionMapper.insertCollection(newCol);

        Long newId = ((Number) newCol.get("collectionId")).longValue();

        Map<String, Object> memberParam = new HashMap<>();
        memberParam.put("collectionId", newId);
        memberParam.put("userId", userId);
        memberParam.put("role", "OWNER");
        memberMapper.insertMember(memberParam);

        placeMapper.copyPlaces(collectionId, newId, userId);

        return collectionMapper.selectCollection(newId);
    }
    
}
