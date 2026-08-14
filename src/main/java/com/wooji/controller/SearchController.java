package com.wooji.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.wooji.common.Res;
import com.wooji.service.SearchService;

@RestController
@RequestMapping("/api")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    /* 상호(장소) 검색 - 장소 등록 시 사용 */
    @GetMapping("/search/places")
    public Map<String, Object> searchPlaces(@RequestParam String keyword) {
        return Res.ok(searchService.searchPlaces(keyword));
    }
    
}
