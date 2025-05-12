#include <iostream>
#include<cstdlib>
using namespace std;
template <typename T>
T getMax(T a, T b) {
T res;
res = (a > b) ? a : b;
return (res);
}
int main()
{
long a, b;
cout << "enter two numbers:" << endl;
cin >> a;
cin >> b;
int n = getMax<long>(a, b);
cout << "the max is:" << n << endl;
}
