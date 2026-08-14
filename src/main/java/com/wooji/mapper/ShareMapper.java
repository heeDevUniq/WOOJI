package com.wooji.mapper;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ShareMapper {

    int insertInvite(Map<String, Object> param);

    Map<String, Object> selectInviteByCode(@Param("inviteCode") String inviteCode);

    List<Map<String, Object>> selectInvites(@Param("collectionId") Long collectionId);

    Map<String, Object> selectInvite(@Param("inviteId") Long inviteId);

    /* 공유 취소 (active_yn = 'N') */
    int deactivateInvite(@Param("inviteId") Long inviteId);

    /* 받은 초대(미수락) 기록 */
    int insertPendingInvite(@Param("inviteId") Long inviteId, @Param("userId") Long userId);

    /* 수락 시 해당 컬렉션의 대기 초대 제거 */
    int deletePendingInvite(@Param("collectionId") Long collectionId, @Param("userId") Long userId);

    /* 내가 받은 대기 중 초대 목록 */
    List<Map<String, Object>> selectPendingInvites(@Param("userId") Long userId);

}
