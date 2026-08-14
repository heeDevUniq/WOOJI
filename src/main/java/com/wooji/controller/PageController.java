package com.wooji.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/* JSP 페이지 라우팅 (인증 검사는 각 페이지 JS에서 토큰 유무로 처리) */
@Controller
public class PageController {

    @Value("${kakao.map.js-key:}")
    private String kakaoMapJsKey;

    private final com.wooji.service.KakaoAuthService kakaoAuthService;

    public PageController(com.wooji.service.KakaoAuthService kakaoAuthService) {
        this.kakaoAuthService = kakaoAuthService;
    }

    @GetMapping("/")
    public String index() {
        return "redirect:/main";
    }

    @GetMapping("/login")
    public String login(Model model) {
        model.addAttribute("kakaoRestKey", kakaoAuthService.getRestApiKey());
        model.addAttribute("kakaoRedirectUri", kakaoAuthService.getRedirectUri());
        return "login";
    }

    /* 카카오 로그인 콜백 (Redirect URI) */
    @GetMapping("/oauth/kakao")
    public String kakaoCallback() {
        return "oauth-kakao";
    }

    @GetMapping("/signup")
    public String signup() {
        return "signup";
    }

    @GetMapping("/main")
    public String main(Model model) {
        model.addAttribute("kakaoMapJsKey", kakaoMapJsKey);
        return "main";
    }

    @GetMapping("/collections/{collectionId}")
    public String collection(@PathVariable Long collectionId, Model model) {
        model.addAttribute("collectionId", collectionId);
        model.addAttribute("kakaoMapJsKey", kakaoMapJsKey);
        return "collection";
    }

    @GetMapping("/invite/{inviteCode}")
    public String invite(@PathVariable String inviteCode, Model model) {
        model.addAttribute("inviteCode", inviteCode);
        return "invite";
    }

    @GetMapping("/mypage")
    public String mypage() {
        return "mypage";
    }
    
}
