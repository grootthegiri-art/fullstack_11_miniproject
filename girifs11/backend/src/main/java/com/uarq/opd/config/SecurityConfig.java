package com.uarq.opd.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;

@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/api/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/queue", "/api/tokens/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/tokens").permitAll()
                .requestMatchers("/api/staff/**").hasRole("STAFF")
                .requestMatchers("/api/doctor/**").hasRole("DOCTOR")
                .anyRequest().authenticated())
            // Plain 401 (no WWW-Authenticate header) so the browser does not pop up its own login box.
            .httpBasic(basic -> basic.authenticationEntryPoint(
                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)));
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /** Demo users kept in memory; passwords are stored as BCrypt hashes. */
    @Bean
    public UserDetailsService users(PasswordEncoder encoder) {
        return new InMemoryUserDetailsManager(
            User.withUsername("staff").password(encoder.encode("staff123")).roles("STAFF").build(),
            User.withUsername("doctor").password(encoder.encode("doctor123")).roles("DOCTOR").build()
        );
    }
}
