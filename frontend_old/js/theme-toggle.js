// Immediate execution to prevent FOUC (Flash of Unstyled Content)
const isDark = localStorage.getItem("theme") === "dark";
if (isDark) {
    document.documentElement.classList.add("dark-mode");
} else {
    document.documentElement.classList.remove("dark-mode");
}

document.addEventListener("DOMContentLoaded", () => {
    // Only DOM manipulation (button creation) goes here
    const btn = document.createElement("button");
    btn.innerHTML = isDark ? "☀️" : "🌙";
    btn.style.position = "fixed";
    btn.style.bottom = "20px";
    btn.style.right = "20px";
    btn.style.width = "56px";
    btn.style.height = "56px";
    btn.style.borderRadius = "28px";
    btn.style.border = "none";
    btn.style.boxShadow = "0 8px 16px rgba(0,0,0,0.2)";
    btn.style.background = isDark ? "#252840" : "#FFFFFF";
    btn.style.color = isDark ? "#FFFFFF" : "#000000";
    btn.style.fontSize = "26px";
    btn.style.cursor = "pointer";
    btn.style.zIndex = "999999";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    
    document.body.appendChild(btn);

    btn.addEventListener("click", () => {
        document.documentElement.classList.toggle("dark-mode");
        const darkActive = document.documentElement.classList.contains("dark-mode");
        localStorage.setItem("theme", darkActive ? "dark" : "light");
        
        btn.innerHTML = darkActive ? "☀️" : "🌙";
        btn.style.background = darkActive ? "#252840" : "#FFFFFF";
        btn.style.color = darkActive ? "#FFFFFF" : "#000000";
        
        // Add a tiny scale animation on click
        btn.style.transform = "scale(0.9)";
        setTimeout(() => { btn.style.transform = "scale(1)"; }, 150);
    });
});
