#!/usr/bin/env python3
"""
Script to fix common flake8 issues in Django management commands
"""
import os
import re
from pathlib import Path

def fix_file(file_path):
    """Fix flake8 issues in a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Remove unused imports
        unused_imports = [
            r'^from datetime import datetime\n',
            r'^from academics\.models import Department\n', 
            r'^from academics\.models\.School import.*\n',
            r'^from django\.db\.models\.signals import post_delete\n',
            r'^from django\.db import transaction\n',
            r'^from academics import signals\n',
            r'^from collections import defaultdict\n',
            r'^from academics\.models import Subject\n',
        ]
        
        for pattern in unused_imports:
            content = re.sub(pattern, '', content, flags=re.MULTILINE)
        
        # Fix unused variables
        content = re.sub(r'(\s+)e = ([^\n]+)\n', r'\1# \2\n', content)
        content = re.sub(r'(\s+)cities = \[([^\]]+)\]', '', content, flags=re.DOTALL)
        content = re.sub(r'(\s+)student = Student\.objects\.create\(', r'\1Student.objects.create(', content)
        content = re.sub(r'(\s+)defaultdict = .*\n', '', content, flags=re.MULTILINE)
        
        # Fix f-strings without placeholders
        content = re.sub(r'f"([^{]+)"', r'"\1"', content)
        
        # Fix bare except
        content = re.sub(r'except:', 'except Exception:', content)
        
        # Fix whitespace before colon
        content = re.sub(r'\s+:', ':', content)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed: {file_path}")
            return True
        else:
            print(f"No changes needed: {file_path}")
            return False
            
    except Exception as e:
        print(f"Error fixing {file_path}: {e}")
        return False

def main():
    """Fix all Django management command files"""
    base_dir = Path(__file__).parent / "backend" / "django" / "academics" / "management" / "commands"
    
    if not base_dir.exists():
        print(f"Directory not found: {base_dir}")
        return
    
    python_files = list(base_dir.glob("*.py"))
    
    if not python_files:
        print(f"No Python files found in {base_dir}")
        return
    
    fixed_count = 0
    for file_path in python_files:
        if fix_file(file_path):
            fixed_count += 1
    
    print(f"\nFixed {fixed_count} out of {len(python_files)} files")

if __name__ == "__main__":
    main()