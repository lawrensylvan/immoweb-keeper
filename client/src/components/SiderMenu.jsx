
import { ClockCircleOutlined, EditOutlined, EyeFilled, HeartFilled, PieChartOutlined, SearchOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons'
import { Menu } from 'antd'
import SubMenu from 'antd/lib/menu/SubMenu'
import { Link } from 'react-router-dom'

export default function SiderMenu({collapsed}) {

    return (
        <Menu theme="dark" defaultSelectedKeys={['1']} mode="vertical" inlineCollapsed={collapsed} >

            <SubMenu key="explore-results" icon={<PieChartOutlined />} title="Explore results">
                <Menu.Item key="advanced-search" icon={<SearchOutlined />}>
                    <Link to="/explore/advanced-search">Advanced search</Link>
                </Menu.Item>
                <Menu.Item key="new-results" icon={<ClockCircleOutlined />}>New results</Menu.Item>
                <Menu.Item key="last-updates" icon={<EditOutlined />}>Last updates</Menu.Item>
            </SubMenu>

            <SubMenu key="my-flagged-items" icon={<UserOutlined />} title="My flagged items">
                <Menu.Item icon={<HeartFilled />} key="liked">
                    <Link to="/flagged-items/liked-estates">Liked</Link>
                </Menu.Item>
                <Menu.Item icon={<EyeFilled />} key="visited">
                    <Link to="/flagged-items/visited-estates">Visited</Link></Menu.Item>
            </SubMenu>

            <Menu.Item key="search-queries" icon={<SettingOutlined />}>
                Search queries
            </Menu.Item>

        </Menu>
    )
}