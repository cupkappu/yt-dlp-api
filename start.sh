#!/bin/bash

# yt-dlp API 服务器启动脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    # 检查 Python
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
    else
        log_error "未找到 Python，请先安装 Python 3.7+"
        exit 1
    fi
    
    # 检查 pip
    if ! command -v pip3 &> /dev/null && ! command -v pip &> /dev/null; then
        log_error "未找到 pip，请先安装 pip"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 安装依赖
install_dependencies() {
    log_info "安装 Python 依赖..."
    
    if [ -f "requirements.txt" ]; then
        if command -v pip3 &> /dev/null; then
            pip3 install -r requirements.txt
        else
            pip install -r requirements.txt
        fi
        log_success "Python 依赖安装完成"
    else
        log_error "requirements.txt 文件不存在"
        exit 1
    fi
    
    # 安装 yt-dlp
    log_info "安装 yt-dlp..."
    if [ -d "reference/yt-dlp" ]; then
        cd reference/yt-dlp
        if command -v pip3 &> /dev/null; then
            pip3 install .
        else
            pip install .
        fi
        cd ../..
        log_success "yt-dlp 安装完成"
    else
        log_error "yt-dlp 源代码目录不存在"
        exit 1
    fi
}

# 检查服务器状态
check_server_status() {
    log_info "检查服务器状态..."
    
    if curl -s http://localhost:8000/health > /dev/null; then
        log_success "服务器正在运行"
        return 0
    else
        log_warning "服务器未运行"
        return 1
    fi
}

# 启动服务器
start_server() {
    log_info "启动 yt-dlp API 服务器..."
    
    # 检查是否已安装依赖
    if ! python3 -c "import fastapi" &> /dev/null; then
        log_warning "依赖未安装，开始安装..."
        install_dependencies
    fi
    
    # 检查服务器是否已在运行
    if check_server_status; then
        log_warning "服务器已在运行，PID: $(pgrep -f 'uvicorn main:app')"
        echo "是否要重启服务器？(y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            stop_server
        else
            log_info "保持服务器运行状态"
            return 0
        fi
    fi
    
    # 启动服务器
    nohup uvicorn main:app --host 0.0.0.0 --port 8000 > server.log 2>&1 &
    SERVER_PID=$!
    
    # 等待服务器启动
    log_info "等待服务器启动..."
    sleep 5
    
    if check_server_status; then
        log_success "服务器启动成功！PID: $SERVER_PID"
        log_success "服务器日志: server.log"
        log_success "API 文档: http://localhost:8000/docs"
        log_success "健康检查: http://localhost:8000/health"
        
        # 保存 PID
        echo $SERVER_PID > server.pid
    else
        log_error "服务器启动失败，请检查 server.log 文件"
        exit 1
    fi
}

# 停止服务器
stop_server() {
    log_info "停止服务器..."
    
    if [ -f "server.pid" ]; then
        SERVER_PID=$(cat server.pid)
        if kill -0 $SERVER_PID 2>/dev/null; then
            kill $SERVER_PID
            rm server.pid
            log_success "服务器已停止"
        else
            log_warning "PID 文件存在但进程未运行"
            rm server.pid
        fi
    else
        # 尝试通过进程名停止
        PIDS=$(pgrep -f "uvicorn main:app" || true)
        if [ -n "$PIDS" ]; then
            echo "$PIDS" | xargs kill
            log_success "服务器已停止"
        else
            log_warning "未找到运行的服务器进程"
        fi
    fi
}

# 重启服务器
restart_server() {
    stop_server
    sleep 2
    start_server
}

# 查看服务器状态
status_server() {
    if check_server_status; then
        log_success "服务器正在运行"
        echo "进程信息:"
        pgrep -f "uvicorn main:app" | xargs ps -o pid,user,command -p
        echo ""
        echo "最近日志:"
        tail -10 server.log 2>/dev/null || echo "无日志文件"
    else
        log_warning "服务器未运行"
    fi
}

# 查看服务器日志
show_logs() {
    if [ -f "server.log" ]; then
        tail -f server.log
    else
        log_error "日志文件不存在"
    fi
}

# 运行测试
run_tests() {
    log_info "运行 API 测试..."
    
    if [ -f "test_api.py" ]; then
        python3 test_api.py
    else
        log_error "测试文件不存在"
    fi
}

# 显示帮助信息
show_help() {
    echo "yt-dlp API 服务器管理脚本"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  start     启动服务器"
    echo "  stop      停止服务器"
    echo "  restart   重启服务器"
    echo "  status    查看服务器状态"
    echo "  logs      查看服务器日志（实时）"
    echo "  test      运行 API 测试"
    echo "  install   安装依赖"
    echo "  help      显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start    # 启动服务器"
    echo "  $0 status   # 查看服务器状态"
    echo "  $0 logs     # 查看实时日志"
}

# 主函数
main() {
    case "${1:-help}" in
        start)
            start_server
            ;;
        stop)
            stop_server
            ;;
        restart)
            restart_server
            ;;
        status)
            status_server
            ;;
        logs)
            show_logs
            ;;
        test)
            run_tests
            ;;
        install)
            install_dependencies
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

# 脚本入口
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    main "$@"
fi
