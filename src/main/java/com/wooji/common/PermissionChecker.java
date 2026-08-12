package com.wooji.common;

import java.util.Map;

import org.springframework.stereotype.Component;

import com.wooji.mapper.CollectionMapper;
import com.wooji.mapper.MemberMapper;

/**
 * 컬렉션 권한 검사 공통 컴포넌트.
 * OWNER > EDITOR > VIEWER (공개 컬렉션은 비멤버도 조회 가능)
 */
@Component
public class PermissionChecker {

    private final MemberMapper memberMapper;
    private final CollectionMapper collectionMapper;

    public PermissionChecker(MemberMapper memberMapper, CollectionMapper collectionMapper) {
        this.memberMapper = memberMapper;
        this.collectionMapper = collectionMapper;
    }

    /* role 조회 (멤버 아니면 null) */
    public String getRole(Long collectionId, Long userId) {
        return memberMapper.selectRole(collectionId, userId);
    }

    /* 멤버이거나 공개 컬렉션인지 - 조회 권한 */
    public void checkViewer(Long collectionId, Long userId) {
        if (getRole(collectionId, userId) != null) {
            return;
        }
        Map<String, Object> collection = collectionMapper.selectCollection(collectionId);
        if (collection == null || !"Y".equals(collection.get("is_public"))) {
            throw new ApiException(403, "해당 컬렉션에 접근 권한이 없습니다.");
        }
    }

    /* EDITOR 이상인지 - 장소 추가/수정/삭제 권한 */
    public void checkEditor(Long collectionId, Long userId) {
        String role = getRole(collectionId, userId);
        if (!"OWNER".equals(role) && !"EDITOR".equals(role)) {
            throw new ApiException(403, "편집 권한이 없습니다.");
        }
    }

    /* OWNER인지 - 컬렉션 수정/삭제/공유/권한관리 */
    public void checkOwner(Long collectionId, Long userId) {
        if (!"OWNER".equals(getRole(collectionId, userId))) {
            throw new ApiException(403, "소유자만 가능합니다.");
        }
    }

}
