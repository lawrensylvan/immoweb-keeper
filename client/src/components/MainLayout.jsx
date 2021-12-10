import React, { useState } from 'react'
import Sider from 'antd/lib/layout/Sider'
import SiderMenu from './SiderMenu'
import { useSearch, SearchContext } from '../hooks/useSearch'
import { Layout, Button } from 'antd'
import '../styles.css'
import { Outlet } from 'react-router'
import { Content, Header } from 'antd/lib/layout/layout'
import BreadCrumbs from './BreadCrumbs'
import { LogoutOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'

export default function MainLayout({isAuthenticated, userName}) {

    const [collapsed, setCollapsed] = useState(false)

    return (

        <SearchContext.Provider value={useSearch()}>
            <Layout className="mainLayout">
                <Sider  theme="dark"
                        collapsible
                        collapsed={collapsed}
                        onCollapse={(c) => setCollapsed(c)}
                        onMouseLeave={() => setCollapsed(true)}
                        onMouseEnter={() => setCollapsed(false)}
                        style={{minHeight: '100vh'}}
                        >
                    <div style={{display: 'flex', justifyContent: 'center', padding: '10px 0px 10px 0px'}}>
                        <img src="logo512.png" alt="Immoweb Keeper" width="70%" style={{maxWidth: '100px'}} />
                    </div>
                    <SiderMenu collapsed={collapsed} />
                </Sider>
                <Content>
                    <Layout>
                        <Header style={{
                            backgroundColor: '#7d827f', maxHeight: '45px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}>
                                
                            <BreadCrumbs/>
                            
                            <div>
                                Welcome <b>{userName}</b> !&nbsp;&nbsp; 
                                <Button size="small">
                                    <Link to="/logout">
                                        <LogoutOutlined/> Log out
                                    </Link>
                                </Button>
                            </div>
                        </Header>
                    </Layout>
                    <Content>
                        <Outlet/>
                    </Content>
                </Content>
            </Layout>
        </SearchContext.Provider>

    )
}
