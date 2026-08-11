package com.wooji.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/** JSP 페이지 라우팅 (인증 검사는 각 페이지 JS에서 토큰 유무로 처리) */
@Controller
public class PageController {

    @GetMapping("/")
    public String index() {
        return "redirect:/main";
    }

    @GetMapping("/login")
    public String login() {
        return "login";
    }

    @GetMapping("/signup")
    public String signup() {
        return "signup";
    }

    @GetMapping("/main")
    public String main() {
        return "main";
    }

    @GetMapping("/collections/{collectionId}")
    public String collection(@PathVariable Long collectionId, Model model) {
        model.addAttribute("collectionId", collectionId);
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
