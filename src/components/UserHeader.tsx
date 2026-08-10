import { Ionicons } from "@expo/vector-icons";
import { Image, TouchableOpacity, View } from "react-native";

const UserHeader = () => {
  return (
    <View className="flex-row justify-between items-center px-4 py-3 bg-white">
      <View className="flex-row items-center">
        <Image
          source={require("../../assets/images/LF3.png")}
          className="h-9 w-36"
          style={{ width: 135, height: 36 }}
          resizeMode="contain"
        />
      </View>

      {/* Right Side: Action Icons */}
      <View className="flex-row items-center gap-5">
        <TouchableOpacity className="relative">
          <Ionicons name="notifications-outline" size={24} color="#333333" />
          <View className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-500 rounded-full border border-white" />
        </TouchableOpacity>
        {/* Search Icon */}
        <TouchableOpacity>
          <Ionicons name="search-outline" size={24} color="#333333" />
        </TouchableOpacity>

        {/* User Profile Avatar Icon */}
        <TouchableOpacity className="w-8 h-8 rounded-full border border-[#72AF5B] items-center justify-center">
          <Ionicons name="person-outline" size={18} color="#333333" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default UserHeader;
