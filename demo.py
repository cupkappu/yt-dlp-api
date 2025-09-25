#!/usr/bin/env python3
"""
yt-dlp API 服务器演示脚本
展示如何使用 API 服务器的各种功能
"""

import requests
import json
import time

# API 服务器地址
BASE_URL = "http://localhost:8000"

def demo_health_check():
    """演示健康检查"""
    print("=== 健康检查演示 ===")
    response = requests.get(f"{BASE_URL}/health")
    if response.status_code == 200:
        data = response.json()
        print(f"✓ 服务器状态: {data['status']}")
        print(f"✓ 时间戳: {data['timestamp']}")
    else:
        print(f"✗ 健康检查失败: {response.status_code}")
    print()

def demo_root_endpoint():
    """演示根端点"""
    print("=== 根端点演示 ===")
    response = requests.get(BASE_URL)
    if response.status_code == 200:
        data = response.json()
        print(f"✓ 服务器信息: {data['message']}")
        print(f"✓ 版本: {data['version']}")
        print("✓ 可用端点:")
        for endpoint, description in data['endpoints'].items():
            print(f"  - {endpoint}: {description}")
    else:
        print(f"✗ 根端点失败: {response.status_code}")
    print()

def demo_video_info():
    """演示视频信息获取"""
    print("=== 视频信息获取演示 ===")
    
    # 使用一个简单的测试视频（这里使用一个公开的短视频）
    test_url = "https://www.youtube.com/watch?v=9bZkp7q19f0"  # PSY - GANGNAM STYLE
    
    print(f"测试视频: {test_url}")
    response = requests.get(f"{BASE_URL}/info/{test_url}")
    
    if response.status_code == 200:
        data = response.json()
        print("✓ 视频信息获取成功")
        print(f"  标题: {data.get('title', '未知')}")
        print(f"  视频ID: {data.get('id', '未知')}")
        print(f"  时长: {data.get('duration', '未知')}秒")
        print(f"  上传者: {data.get('uploader', '未知')}")
        print(f"  上传日期: {data.get('upload_date', '未知')}")
        print(f"  格式数量: {len(data.get('formats', []))}")
        print(f"  缩略图数量: {len(data.get('thumbnails', []))}")
    else:
        print(f"✗ 视频信息获取失败: {response.status_code}")
        print(f"  错误信息: {response.text}")
    print()

def demo_async_download():
    """演示异步下载功能"""
    print("=== 异步下载演示 ===")
    
    # 使用一个简单的测试视频
    test_url = "https://www.youtube.com/watch?v=9bZkp7q19f0"
    
    download_data = {
        "url": test_url,
        "format": "worst",  # 使用最差质量以快速完成测试
        "options": {
            "ignoreerrors": True
        }
    }
    
    print("启动异步下载任务...")
    response = requests.post(f"{BASE_URL}/download", json=download_data)
    
    if response.status_code == 200:
        data = response.json()
        task_id = data.get('task_id')
        print(f"✓ 下载任务启动成功")
        print(f"  任务ID: {task_id}")
        print(f"  状态: {data.get('status')}")
        print(f"  消息: {data.get('message')}")
        
        # 监控任务进度
        print("监控任务进度...")
        max_wait = 30  # 最大等待30秒
        wait_time = 0
        
        while wait_time < max_wait:
            time.sleep(3)
            wait_time += 3
            
            status_response = requests.get(f"{BASE_URL}/task/{task_id}")
            if status_response.status_code == 200:
                status_data = status_response.json()
                status = status_data.get('status')
                progress = status_data.get('progress', '0%')
                
                print(f"  当前状态: {status}, 进度: {progress}")
                
                if status == 'completed':
                    print("✓ 下载任务完成！")
                    print(f"  文件名: {status_data.get('filename', '未知')}")
                    return True
                elif status == 'failed':
                    error = status_data.get('error', '未知错误')
                    print(f"✗ 下载任务失败: {error}")
                    return False
            else:
                print(f"✗ 获取任务状态失败: {status_response.status_code}")
                return False
        
        print("✗ 下载任务超时")
        return False
    else:
        print(f"✗ 下载任务启动失败: {response.status_code}")
        print(f"  错误信息: {response.text}")
        return False

def demo_task_management():
    """演示任务管理功能"""
    print("=== 任务管理演示 ===")
    
    response = requests.get(f"{BASE_URL}/tasks")
    if response.status_code == 200:
        data = response.json()
        print("✓ 任务列表获取成功")
        print(f"  活跃任务数: {data['stats']['active']}")
        print(f"  已完成任务数: {data['stats']['completed']}")
        print(f"  最大并发数: {data['stats']['max_concurrent']}")
        
        if data['active_tasks']:
            print("  活跃任务:")
            for task in data['active_tasks']:
                print(f"    - {task['task_id']}: {task['status']} ({task['progress']})")
        
        if data['completed_tasks']:
            print("  最近完成的任务:")
            for task in data['completed_tasks'][-3:]:  # 显示最近3个
                print(f"    - {task['task_id']}: {task['status']}")
    else:
        print(f"✗ 任务列表获取失败: {response.status_code}")
    print()

def main():
    """主演示函数"""
    print("=" * 50)
    print("yt-dlp API 服务器演示")
    print("=" * 50)
    print()
    
    # 检查服务器连接
    print("检查服务器连接...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✓ 服务器连接正常")
        else:
            print("✗ 服务器连接失败")
            return
    except Exception as e:
        print(f"✗ 无法连接到服务器: {e}")
        print("请确保服务器正在运行: docker-compose up -d")
        return
    
    print()
    
    # 运行演示
    demos = [
        demo_health_check,
        demo_root_endpoint,
        demo_video_info,
        demo_task_management,
        demo_async_download
    ]
    
    for demo in demos:
        try:
            demo()
        except Exception as e:
            print(f"演示失败: {e}")
            print()
    
    print("=" * 50)
    print("演示完成！")
    print()
    print("下一步:")
    print("1. 访问 http://localhost:8000/docs 查看完整 API 文档")
    print("2. 使用 curl 或 Postman 测试具体功能")
    print("3. 参考 README.md 了解更多使用示例")
    print("4. 修改 main.py 中的配置来自定义服务器行为")
    print("=" * 50)

if __name__ == "__main__":
    main()
