package com.wooji.service;

import java.net.URI;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.wooji.common.ApiException;

/**
 * 상호(장소) 검색.
 * - kakao.search.rest-api-key 설정 시: 카카오 로컬 키워드 검색 (국내 상호 정확도 높음, 15건)
 * - 미설정 시: OSM Nominatim 폴백 (키 불필요, 상호 검색 정확도는 낮음)
 */
@Service
public class SearchService {

    @Value("${kakao.search.rest-api-key:}")
    private String kakaoKey;

    private final RestTemplate rest = new RestTemplate();

    public List<Map<String, Object>> searchPlaces(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            throw new ApiException(400, "검색어를 입력하세요.");
        }
        try {
            if (!kakaoKey.trim().isEmpty()) {
                return searchKakao(keyword.trim());
            }
            return searchNominatim(keyword.trim());
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(502, "장소 검색에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
    }

    /** 카카오 로컬 API - 키워드로 장소 검색 */
    @SuppressWarnings({"unchecked", "rawtypes"})
    private List<Map<String, Object>> searchKakao(String keyword) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "KakaoAK " + kakaoKey.trim());

        URI uri = UriComponentsBuilder.fromHttpUrl("https://dapi.kakao.com/v2/local/search/keyword.json")
                .queryParam("query", keyword)
                .queryParam("size", 15)
                .build().encode().toUri();

        ResponseEntity<Map> res = rest.exchange(uri, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
        List<Map<String, Object>> documents = (List<Map<String, Object>>) res.getBody().get("documents");

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> d : documents) {
            Map<String, Object> m = new HashMap<>();
            m.put("name", d.get("place_name"));
            String roadAddr = (String) d.get("road_address_name");
            m.put("address", roadAddr != null && !roadAddr.isEmpty() ? roadAddr : d.get("address_name"));
            m.put("lat", d.get("y"));
            m.put("lng", d.get("x"));
            m.put("phone", d.get("phone"));
            m.put("category", mapKakaoCategory((String) d.get("category_group_code")));
            m.put("categoryName", d.get("category_name"));
            m.put("url", d.get("place_url"));
            m.put("provider", "kakao");
            result.add(m);
        }
        return result;
    }

    /** 카카오 카테고리 그룹코드 -> WOOJI 카테고리 */
    private String mapKakaoCategory(String code) {
        if ("FD6".equals(code)) return "RESTAURANT";  // 음식점
        if ("CE7".equals(code)) return "CAFE";        // 카페
        if ("AT4".equals(code)) return "SIGHT";       // 관광명소
        if ("AD5".equals(code)) return "HOTEL";       // 숙박
        if ("MT1".equals(code) || "CS2".equals(code)) return "SHOP";  // 마트/편의점
        if ("PK6".equals(code)) return "PARKING";     // 주차장
        return "ETC";
    }

    /** OSM Nominatim 폴백 (API 키 불필요) */
    @SuppressWarnings({"unchecked", "rawtypes"})
    private List<Map<String, Object>> searchNominatim(String keyword) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "WOOJI/1.0 (collaborative place curation)");

        URI uri = UriComponentsBuilder.fromHttpUrl("https://nominatim.openstreetmap.org/search")
                .queryParam("q", keyword)
                .queryParam("format", "json")
                .queryParam("limit", 15)
                .queryParam("countrycodes", "kr")
                .queryParam("accept-language", "ko")
                .build().encode().toUri();

        ResponseEntity<List> res = rest.exchange(uri, HttpMethod.GET, new HttpEntity<>(headers), List.class);
        List<Map<String, Object>> items = (List<Map<String, Object>>) res.getBody();

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> d : items) {
            Map<String, Object> m = new HashMap<>();
            String displayName = (String) d.get("display_name");
            m.put("name", d.get("name") != null && !((String) d.get("name")).isEmpty()
                    ? d.get("name")
                    : (displayName != null ? displayName.split(",")[0] : keyword));
            m.put("address", displayName);
            m.put("lat", d.get("lat"));
            m.put("lng", d.get("lon"));
            m.put("phone", null);
            m.put("category", "ETC");
            m.put("categoryName", d.get("type"));
            m.put("url", null);
            m.put("provider", "osm");
            result.add(m);
        }
        return result;
    }
    
}
