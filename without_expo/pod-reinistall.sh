rm -rf ~/Library/Developer/Xcode/DerivedData
pod cache clean --all
rm -rf Pods
rm -r Podfile.lock
pod install --repo-update