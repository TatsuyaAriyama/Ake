# ios プロジェクトへ PrivacyInfo.xcprivacy と InfoPlist.strings（en/ja）を登録する。
# CocoaPods 同梱の xcodeproj gem を使う:
#   GEM_HOME=".../cocoapods/.../libexec" ruby scripts/add_ios_resources.rb
require 'xcodeproj'

proj_path = 'ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(proj_path)
target = project.targets.find { |t| t.name == 'App' }
raise 'App target not found' unless target

app_group = project.main_group['App']
raise 'App group not found' unless app_group

# --- 1. PrivacyInfo.xcprivacy を Copy Bundle Resources へ ---
priv_name = 'PrivacyInfo.xcprivacy'
unless app_group.files.any? { |f| f.path == priv_name }
  ref = app_group.new_reference(priv_name)
  target.add_resources([ref])
  puts "added resource: #{priv_name}"
else
  puts "exists: #{priv_name}"
end

# --- 2. InfoPlist.strings を変種グループ（en/ja）として登録 ---
unless app_group.children.any? { |c| c.display_name == 'InfoPlist.strings' }
  var_group = project.new(Xcodeproj::Project::Object::PBXVariantGroup)
  var_group.name = 'InfoPlist.strings'
  var_group.source_tree = '<group>'
  app_group.children << var_group

  { 'Base' => 'Base.lproj/InfoPlist.strings',
    'ja'   => 'ja.lproj/InfoPlist.strings' }.each do |lang, path|
    fref = project.new(Xcodeproj::Project::Object::PBXFileReference)
    fref.name = lang
    fref.path = path
    fref.source_tree = '<group>'
    fref.last_known_file_type = 'text.plist.strings'
    var_group.children << fref
  end
  target.add_resources([var_group])
  puts 'added variant group: InfoPlist.strings (Base, ja)'
else
  puts 'exists: InfoPlist.strings variant group'
end

# --- 3. プロジェクトへ ja ローカライズを登録 ---
known = project.root_object.known_regions
%w[en ja Base].each { |r| known << r unless known.include?(r) }
project.root_object.known_regions = known
puts "known regions: #{project.root_object.known_regions.inspect}"

project.save
puts 'saved.'
