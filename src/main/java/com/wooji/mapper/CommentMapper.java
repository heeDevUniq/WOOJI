package com.wooji.mapper;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface CommentMapper {

    int insertComment(Map<String, Object> param);

    Map<String, Object> selectComment(@Param("commentId") Long commentId);

    /** 좋아요 수 / 내 좋아요 여부 포함 목록 */
    List<Map<String, Object>> selectComments(@Param("collectionId") Long collectionId, @Param("userId") Long userId);

    int updateComment(Map<String, Object> param);

    int deleteComment(@Param("commentId") Long commentId);

    // 좋아요
    int insertLike(@Param("commentId") Long commentId, @Param("userId") Long userId);

    int deleteLike(@Param("commentId") Long commentId, @Param("userId") Long userId);

    int countLike(@Param("commentId") Long commentId, @Param("userId") Long userId);

}
