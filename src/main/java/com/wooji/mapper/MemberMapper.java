package com.wooji.mapper;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface MemberMapper {

    int insertMember(Map<String, Object> param);

    int updateMemberRole(Map<String, Object> param);

    int deleteMember(@Param("collectionId") Long collectionId, @Param("userId") Long userId);

    List<Map<String, Object>> selectMembers(@Param("collectionId") Long collectionId);

    /* 해당 컬렉션에서의 role 조회 (없으면 null) */
    String selectRole(@Param("collectionId") Long collectionId, @Param("userId") Long userId);

}
