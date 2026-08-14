package com.wooji.controller;

import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.wooji.common.Res;
import com.wooji.service.KakaoAuthService;
import com.wooji.service.UserService;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final UserService userService;

    private final KakaoAuthService kakaoAuthService;

    public AuthController(UserService userService, KakaoAuthService kakaoAuthService) {
        this.userService = userService;
        this.kakaoAuthService = kakaoAuthService;
    }

    private Long userId(HttpServletRequest request) {
        return (Long) request.getAttribute("userId");
    }

    // 인증 (인터셉터 제외 경로)
    /* 회원가입 */
    @PostMapping("/auth/signup")
    public Map<String, Object> signup(@RequestBody Map<String, Object> param) {
        return Res.ok(userService.signup(param));
    }

    /* 이메일 중복 확인 */
    @GetMapping("/auth/check-email")
    public Map<String, Object> checkEmail(@RequestParam String email) {
        return Res.ok(userService.isEmailAvailable(email));
    }

    /* 로그인 */
    @PostMapping("/auth/login")
    public Map<String, Object> login(@RequestBody Map<String, Object> param) {
        return Res.ok(userService.login(param));
    }

    /* 카카오 로그인 - 인가코드로 로그인/가입 후 토큰 발급 */
    @PostMapping("/auth/kakao")
    public Map<String, Object> kakaoLogin(@RequestBody Map<String, Object> param) {
        String code = (String) param.get("code");
        if (code == null || code.trim().isEmpty()) {
            return Res.error("인가코드가 없습니다.");
        }
        return Res.ok(userService.kakaoLogin(kakaoAuthService.getKakaoUser(code)));
    }

    /* Access Token 재발급 */
    @PostMapping("/auth/refresh")
    public Map<String, Object> refresh(@RequestBody Map<String, Object> param) {
        return Res.ok(userService.refresh(param));
    }

    /* 로그아웃 */
    @PostMapping("/auth/logout")
    public Map<String, Object> logout(@RequestBody(required = false) Map<String, Object> param) {
        userService.logout(param == null ? null : (String) param.get("refreshToken"));
        return Res.ok();
    }

    // 사용자
    /* 내 정보 */
    @GetMapping("/users/me")
    public Map<String, Object> me(HttpServletRequest request) {
        return Res.ok(userService.getMe(userId(request)));
    }

    /* 비밀번호 변경 */
    @PutMapping("/users/password")
    public Map<String, Object> changePassword(HttpServletRequest request, @RequestBody Map<String, Object> param) {
        userService.changePassword(userId(request), param);
        return Res.ok();
    }

    /* 프로필(닉네임) 수정 */
    @PutMapping("/users/profile")
    public Map<String, Object> updateProfile(HttpServletRequest request, @RequestBody Map<String, Object> param) {
        userService.updateProfile(userId(request), param);
        return Res.ok();
    }

    /* 프로필 이미지 변경 */
    @PostMapping("/users/profile-image")
    public Map<String, Object> updateProfileImage(HttpServletRequest request, @RequestParam("file") MultipartFile file) {
        return Res.ok(userService.updateProfileImage(userId(request), file));
    }

    /* 회원 탈퇴 */
    @DeleteMapping("/users/me")
    public Map<String, Object> withdraw(HttpServletRequest request) {
        userService.withdraw(userId(request));
        return Res.ok();
    }
    
}
