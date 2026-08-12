package com.wooji.common;

import java.util.HashMap;
import java.util.Map;

/* 공통 응답 포맷: { success, message, data } */
public class Res {

    public static Map<String, Object> ok() {
        return ok(null);
    }

    public static Map<String, Object> ok(Object data) {
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("data", data);
        return res;
    }

    public static Map<String, Object> error(String message) {
        Map<String, Object> res = new HashMap<>();
        res.put("success", false);
        res.put("message", message);
        return res;
    }

}
