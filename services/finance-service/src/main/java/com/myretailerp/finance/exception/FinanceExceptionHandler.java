package com.myretailerp.finance.exception;

import com.myretailerp.common.dto.ApiResponse;
import com.myretailerp.common.exception.GlobalExceptionHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Slf4j
public class FinanceExceptionHandler extends GlobalExceptionHandler {

    @ExceptionHandler(JournalEntryNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(
            JournalEntryNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(AuthorizationDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(
            AuthorizationDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(
                        "Access denied — insufficient permissions"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneric(
            Exception ex) {
        log.error("Unexpected error: ", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(ex.getMessage()));
    }
}
