package com.wooji.mapper;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface PlaceMapper {

    int insertPlace(Map<String, Object> param);

    Map<String, Object> selectPlace(@Param("placeId") Long placeId);

    /* 검색(keyword/category) 조건 포함 목록 조회 */
    List<Map<String, Object>> selectPlaces(Map<String, Object> param);

    /* 반경 검색 (Haversine) - param: collectionId, lat, lng, radiusM */
    List<Map<String, Object>> selectPlacesNearby(Map<String, Object> param);

    int updatePlace(Map<String, Object> param);

    int deletePlace(@Param("placeId") Long placeId);

    /* 컬렉션 복제 시 장소 일괄 복사 */
    int copyPlaces(@Param("fromCollectionId") Long fromCollectionId, @Param("toCollectionId") Long toCollectionId, @Param("userId") Long userId);

    // 사진
    int insertPhoto(Map<String, Object> param);

    List<Map<String, Object>> selectPhotos(@Param("placeId") Long placeId);

    int deletePhoto(@Param("photoId") Long photoId);

}
