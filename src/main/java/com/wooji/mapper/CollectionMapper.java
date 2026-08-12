package com.wooji.mapper;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface CollectionMapper {

    int insertCollection(Map<String, Object> param);

    Map<String, Object> selectCollection(@Param("collectionId") Long collectionId);

    /* 내가 소유했거나 멤버로 참여 중인 컬렉션 목록 */
    List<Map<String, Object>> selectMyCollections(@Param("userId") Long userId);

    /* 공개 컬렉션 목록 */
    List<Map<String, Object>> selectPublicCollections(@Param("keyword") String keyword);

    int updateCollection(Map<String, Object> param);

    int deleteCollection(@Param("collectionId") Long collectionId);

    // 즐겨찾기
    int insertFavorite(@Param("userId") Long userId, @Param("collectionId") Long collectionId);

    int deleteFavorite(@Param("userId") Long userId, @Param("collectionId") Long collectionId);

    int countFavorite(@Param("userId") Long userId, @Param("collectionId") Long collectionId);
}
